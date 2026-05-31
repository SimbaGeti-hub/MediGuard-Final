import json
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, AIMessage, ToolMessage, HumanMessage

from app.agent.state import AgentState
from app.agent.tools import get_enabled_tools
from app.agent.prompts import build_system_prompt
from app.agent.sub_agents.emergency_classifier import classify_emergency
from app.agent.memory import get_relevant_memories, save_memory
from app.config import get_settings
from app.utils.token_counter import count_tokens, calculate_cost

settings = get_settings()


def get_llm(user_settings: dict):
    model = user_settings.get("model", settings.DEFAULT_MODEL)
    temperature = float(user_settings.get("temperature", settings.DEFAULT_TEMPERATURE))
    top_p = float(user_settings.get("top_p", 1.0))

    if model.startswith("claude") and settings.ANTHROPIC_API_KEY:
        return ChatAnthropic(
            model=model,
            temperature=temperature,
            api_key=settings.ANTHROPIC_API_KEY,
        )
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        top_p=top_p,
        frequency_penalty=float(user_settings.get("frequency_penalty", 0.0)),
        api_key=settings.OPENAI_API_KEY,
    )


async def safety_classifier_node(state: AgentState) -> dict:
    """Node 1: Emergency sub-agent — runs before any other processing (MAS pattern)."""
    user_message = ""
    for msg in reversed(state["messages"]):
        if hasattr(msg, "type") and msg.type == "human":
            user_message = msg.content
            break
        elif isinstance(msg, dict) and msg.get("role") == "user":
            user_message = msg.get("content", "")
            break

    emergency_result = await classify_emergency(user_message)

    risk_level = "low"
    if emergency_result["is_emergency"] and emergency_result["confidence"] > 0.7:
        risk_level = "critical"
    elif emergency_result["confidence"] > 0.4:
        risk_level = "high"

    return {
        "emergency_detected": emergency_result["is_emergency"] and emergency_result["confidence"] > 0.7,
        "risk_level": risk_level,
        "current_concern": user_message,
        "iteration_count": 0,
        "max_iterations": 6,
        "should_stop": False,
        "tools_called": [],
        "react_steps": [],
        "tool_results": {},
        "retrieved_context": [],
        "hitl_required": False,
        "hitl_approved": False,
        "hitl_reason": "",
        "error_message": "",
        "tokens_used": 0,
        "cost_usd": 0.0,
    }


async def profile_loader_node(state: AgentState) -> dict:
    """Node 2: Load long-term memories relevant to this query."""
    user_id = state.get("user_id", "")
    current_concern = state.get("current_concern", "")
    memories = []
    if user_id:
        memories = await get_relevant_memories(user_id=user_id, query=current_concern, max_results=5)
    return {"long_term_memories": memories}


async def agent_reasoner_node(state: AgentState) -> dict:
    """Node 3: Core ReAct reasoning — LLM decides what tools to call next."""
    if state.get("iteration_count", 0) >= state.get("max_iterations", 6):
        return {"should_stop": True, "error_message": "Max iterations reached"}

    system_prompt = build_system_prompt(
        profile=state.get("user_profile", {}),
        memories=state.get("long_term_memories", []),
        settings=state.get("user_settings", {}),
        tool_toggles={k: v for k, v in state.get("user_settings", {}).items() if k.startswith("tool_")},
    )

    enabled_tools = get_enabled_tools(state.get("user_settings", {}))
    llm = get_llm(state.get("user_settings", {}))
    llm_with_tools = llm.bind_tools(enabled_tools)

    messages = [SystemMessage(content=system_prompt)] + list(state["messages"])
    response = await llm_with_tools.ainvoke(messages)

    model = state.get("user_settings", {}).get("model", settings.DEFAULT_MODEL)
    tokens = count_tokens(str(response.content), model)
    cost = calculate_cost(tokens, model)

    react_step = {
        "iteration": state.get("iteration_count", 0) + 1,
        "thought": response.content if response.content else "Analyzing and selecting tool...",
        "tool_calls": [tc["name"] for tc in (response.tool_calls or [])],
    }

    return {
        "messages": [response],
        "iteration_count": state.get("iteration_count", 0) + 1,
        "tokens_used": state.get("tokens_used", 0) + tokens,
        "cost_usd": state.get("cost_usd", 0.0) + cost,
        "model_used": model,
        "react_steps": state.get("react_steps", []) + [react_step],
        "should_stop": not bool(response.tool_calls),
    }


async def tool_executor_node(state: AgentState) -> dict:
    """Node 4: Execute tool calls — the Act step in ReAct."""
    last_message = state["messages"][-1]
    tool_calls = last_message.tool_calls if hasattr(last_message, "tool_calls") else []
    if not tool_calls:
        return {"should_stop": True}

    enabled_tools = get_enabled_tools(state.get("user_settings", {}))
    tool_map = {t.name: t for t in enabled_tools}

    tool_messages = []
    new_tool_results = dict(state.get("tool_results", {}))
    new_tools_called = list(state.get("tools_called", []))
    updated_react_steps = list(state.get("react_steps", []))

    for tool_call in tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_call_id = tool_call["id"]

        # Doom-loop detection — same args called 3+ times
        call_signature = f"{tool_name}:{json.dumps(tool_args, sort_keys=True)}"
        if new_tools_called.count(call_signature) >= 3:
            tool_messages.append(ToolMessage(
                content=f"Tool '{tool_name}' already called 3 times with same args. Use existing results.",
                tool_call_id=tool_call_id,
            ))
            continue

        if tool_name not in tool_map:
            tool_messages.append(ToolMessage(
                content=f"Tool '{tool_name}' is not available or has been disabled.",
                tool_call_id=tool_call_id,
            ))
            continue

        try:
            tool_result = await tool_map[tool_name].ainvoke(tool_args)
            result_str = json.dumps(tool_result) if isinstance(tool_result, dict) else str(tool_result)
            tool_messages.append(ToolMessage(content=result_str, tool_call_id=tool_call_id))
            new_tool_results[tool_name] = tool_result
            new_tools_called.append(call_signature)

            if updated_react_steps:
                updated_react_steps[-1]["observation"] = f"Tool '{tool_name}' returned: {result_str[:300]}"

            # Escalate risk if tool detects emergency
            if isinstance(tool_result, dict) and tool_result.get("urgency", "").upper() == "CRITICAL":
                state["risk_level"] = "critical"
                state["emergency_detected"] = True

        except Exception as e:
            tool_messages.append(ToolMessage(
                content=f"Tool error: {str(e)}. Try a different approach.",
                tool_call_id=tool_call_id,
            ))

    return {
        "messages": tool_messages,
        "tool_results": new_tool_results,
        "tools_called": new_tools_called,
        "react_steps": updated_react_steps,
    }


async def hitl_checkpoint_node(state: AgentState) -> dict:
    """Node 5: Human-in-the-Loop pause point for high-risk situations."""
    risk = state.get("risk_level", "low")
    emergency = state.get("emergency_detected", False)

    hitl_required = False
    hitl_reason = ""

    if emergency:
        hitl_required = True
        hitl_reason = "Emergency situation detected. Please review this response before it is sent."
    elif risk == "critical":
        hitl_required = True
        hitl_reason = "Critical risk level detected. Please review before proceeding."
    elif risk == "high":
        hitl_required = True
        hitl_reason = "High-risk health concern identified. Confirm you want the AI to provide this guidance."

    return {"hitl_required": hitl_required, "hitl_reason": hitl_reason}


async def response_formatter_node(state: AgentState) -> dict:
    """Node 6: Post-processing — save memories, complete audit trail."""
    user_id = state.get("user_id", "")
    session_id = state.get("session_id", "")
    tool_results = state.get("tool_results", {})

    if tool_results and user_id:
        if "assess_symptoms" in tool_results:
            result = tool_results["assess_symptoms"]
            await save_memory(
                user_id=user_id,
                session_id=session_id,
                memory_type="symptom_pattern",
                content=f"Reported: {state.get('current_concern', '')[:200]}. Urgency: {result.get('urgency', 'unknown')}",
                keywords=result.get("symptoms_analyzed", []),
                importance=3 if result.get("urgency") == "low" else 4,
            )

    return {"should_stop": True}