from app.agent.state import AgentState


def route_after_safety_check(state: AgentState) -> str:
    return "profile_loader"


def route_after_reasoning(state: AgentState) -> str:
    if state.get("should_stop", False):
        return "hitl_checkpoint"
    messages = state.get("messages", [])
    if messages:
        last_msg = messages[-1]
        if hasattr(last_msg, "tool_calls") and last_msg.tool_calls:
            return "tool_executor"
    return "hitl_checkpoint"


def route_after_tools(state: AgentState) -> str:
    return "agent_reasoner"


def route_after_hitl(state: AgentState) -> str:
    if state.get("hitl_required", False) and not state.get("hitl_approved", False):
        return "wait_for_approval"
    return "response_formatter"
