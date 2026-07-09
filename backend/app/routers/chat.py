import json
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, AIMessage

from app.dependencies import get_current_user
from app.agent.graph import get_graph
from app.agent.middleware import validate_input, log_audit
from app.db.sessions import create_session, update_session_title, update_session_risk
from app.db.messages import save_message, get_session_messages
from app.db.profiles import get_profile
from app.db.settings_db import get_user_settings
from app.db.medications import get_medications, get_adherence_rate
from app.db.mental_health import get_mood_entries, get_assessments, get_journal_entries
from app.db.symptoms import get_symptom_logs
from app.schemas.chat import ChatRequest, HITLApprovalRequest
from app.config import get_settings
from langchain_openai import ChatOpenAI

app_settings = get_settings()
router = APIRouter()
logger = logging.getLogger(__name__)


async def _generate_session_title(session_id: str, first_message: str) -> str:
    """Generate a short title and save it to DB."""
    logger.info(f"[TITLE] Generating for session={session_id} msg='{first_message[:60]}'")

    fallback = first_message[:50].strip()
    if len(first_message) > 50:
        fallback = fallback.rsplit(' ', 1)[0]

    if not app_settings.OPENAI_API_KEY:
        await update_session_title(session_id, fallback)
        return fallback

    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            max_tokens=20,
            api_key=app_settings.OPENAI_API_KEY,
        )
        from langchain_core.messages import HumanMessage as HM
        response = await llm.ainvoke([HM(content=(
            "Generate a short 3-5 word title for this health conversation. "
            "Return ONLY the title, no punctuation, no quotes, no explanation.\n\n"
            f"Message: {first_message[:200]}"
        ))])
        generated = response.content.strip().strip('"').strip("'").strip()[:60]
        if generated and len(generated) > 2:
            await update_session_title(session_id, generated)
            return generated
    except Exception as e:
        logger.error(f"[TITLE] LLM error: {e}")

    await update_session_title(session_id, fallback)
    return fallback


async def _load_user_context(user_id: str) -> dict:
    """
    Load ALL user health data in parallel — Phase 1 full integration.
    Fetches medications, adherence, mood, assessments, journals, and symptoms
    all at once using asyncio.gather so there is no sequential delay.
    """
    results = await asyncio.gather(
        get_medications(user_id, active_only=True),
        get_adherence_rate(user_id, days=7),
        get_mood_entries(user_id, days=30),
        get_assessments(user_id),
        get_journal_entries(user_id, limit=5),
        get_symptom_logs(user_id, days=30),
        return_exceptions=True,
    )

    def safe(result, default):
        return default if isinstance(result, Exception) else (result or default)

    context = {
        "medications":     safe(results[0], []),
        "adherence":       safe(results[1], {}),
        "mood_entries":    safe(results[2], []),
        "assessments":     safe(results[3], []),
        "journal_entries": safe(results[4], []),
        "symptom_logs":    safe(results[5], []),
    }

    logger.info(
        f"[CONTEXT] meds={len(context['medications'])} "
        f"mood={len(context['mood_entries'])} "
        f"symptoms={len(context['symptom_logs'])} "
        f"assessments={len(context['assessments'])}"
    )
    return context


@router.post("/stream")
async def stream_chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    user_message = request.message.strip()

    valid, error_msg = validate_input(user_message)
    if not valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Load profile, settings, and all health context in parallel
    profile, user_settings, health_context = await asyncio.gather(
        get_profile(user_id),
        get_user_settings(user_id),
        _load_user_context(user_id),
    )

    if not user_settings:
        user_settings = {
            "model": "gpt-4o", "personality": "friendly", "temperature": 0.7,
            "tool_assess_symptoms": True, "tool_drug_interactions": True,
            "tool_medical_knowledge": True, "tool_find_care_level": True,
            "tool_update_health_profile": True,
        }

    # Frontend always sends active UI language — override DB value
    if request.language:
        user_settings = {**user_settings, "language": request.language}

    session_id = request.session_id
    if not session_id:
        session = await create_session(user_id)
        session_id = session["id"]

    existing = await get_session_messages(session_id, user_id)
    is_first_message = len(existing) == 0
    logger.info(f"[CHAT] session={session_id} is_first={is_first_message}")

    await save_message(session_id=session_id, user_id=user_id, role="user", content=user_message)

    async def event_generator():
        graph = get_graph()
        config = {"configurable": {"thread_id": session_id}}

        initial_state = {
            "messages": [HumanMessage(content=user_message)],
            "user_id": user_id,
            "session_id": session_id,
            "user_profile": profile,
            "user_settings": user_settings,
            "long_term_memories": [],
            # Phase 1 — full integrated health context
            "medications":     health_context["medications"],
            "adherence":       health_context["adherence"],
            "mood_entries":    health_context["mood_entries"],
            "assessments":     health_context["assessments"],
            "journal_entries": health_context["journal_entries"],
            "symptom_logs":    health_context["symptom_logs"],
        }

        final_response = ""
        agent_steps = []
        tokens = 0
        cost = 0.0
        risk = "low"
        hitl_triggered = False
        streamed_content: set = set()

        try:
            async for chunk in graph.astream(initial_state, config=config, stream_mode="updates"):
                for node_name, node_output in chunk.items():

                    if node_name == "safety_classifier":
                        risk = node_output.get("risk_level", "low")
                        emergency = node_output.get("emergency_detected", False)
                        logger.info(f"[SAFETY] risk={risk} emergency={emergency}")
                        if emergency:
                            yield f"data: {json.dumps({'type': 'emergency', 'risk_level': risk})}\n\n"
                        else:
                            yield f"data: {json.dumps({'type': 'thinking', 'message': 'Analyzing your concern...'})}\n\n"
                        if risk in ("high", "critical"):
                            yield f"data: {json.dumps({'type': 'risk_update', 'risk_level': risk})}\n\n"

                    elif node_name == "agent_reasoner":
                        react_steps = node_output.get("react_steps", [])
                        if react_steps:
                            agent_steps = react_steps
                        new_tokens = node_output.get("tokens_used", 0)
                        new_cost = node_output.get("cost_usd", 0)
                        if new_tokens:
                            tokens = new_tokens
                            cost = new_cost
                            yield f"data: {json.dumps({'type': 'token_update', 'tokens': tokens, 'cost': cost})}\n\n"
                        for msg in node_output.get("messages", []):
                            if (isinstance(msg, AIMessage) and msg.content
                                    and not getattr(msg, "tool_calls", None)
                                    and msg.content not in streamed_content):
                                streamed_content.add(msg.content)
                                final_response = msg.content
                                words = msg.content.split(" ")
                                for i, word in enumerate(words):
                                    yield f"data: {json.dumps({'type': 'message', 'content': word + (' ' if i < len(words) - 1 else ''), 'done': False})}\n\n"
                                    await asyncio.sleep(0.02)

                    elif node_name == "tool_executor":
                        yield f"data: {json.dumps({'type': 'thinking', 'message': 'Running health tools...'})}\n\n"
                        for tool_name in node_output.get("tool_results", {}).keys():
                            yield f"data: {json.dumps({'type': 'tool_result', 'tool': tool_name, 'status': 'complete'})}\n\n"

                    elif node_name == "hitl_checkpoint":
                        if node_output.get("hitl_required"):
                            hitl_triggered = True
                            yield f"data: {json.dumps({'type': 'hitl_required', 'reason': node_output.get('hitl_reason', ''), 'session_id': session_id})}\n\n"

                    elif node_name == "response_formatter":
                        for msg in node_output.get("messages", []):
                            if (isinstance(msg, AIMessage) and msg.content
                                    and msg.content not in streamed_content):
                                streamed_content.add(msg.content)
                                final_response = msg.content
                                words = msg.content.split(" ")
                                for i, word in enumerate(words):
                                    yield f"data: {json.dumps({'type': 'message', 'content': word + (' ' if i < len(words) - 1 else ''), 'done': False})}\n\n"
                                    await asyncio.sleep(0.02)

            # Fallback: read from graph state if nothing was streamed
            if not final_response:
                logger.warning("[CHAT] No streamed response — reading from graph state")
                graph_state = graph.get_state(config)
                vals = graph_state.values
                agent_steps = vals.get("react_steps", agent_steps)
                tokens = vals.get("tokens_used", tokens)
                cost = vals.get("cost_usd", cost)
                if vals.get("risk_level"):
                    risk = vals["risk_level"]
                for msg in reversed(vals.get("messages", [])):
                    if (isinstance(msg, AIMessage) and msg.content
                            and not getattr(msg, "tool_calls", None)):
                        final_response = msg.content
                        words = final_response.split(" ")
                        for i, word in enumerate(words):
                            yield f"data: {json.dumps({'type': 'message', 'content': word + (' ' if i < len(words) - 1 else ''), 'done': False})}\n\n"
                            await asyncio.sleep(0.02)
                        break

            if final_response:
                logger.info(f"[CHAT] Saving assistant msg risk={risk} len={len(final_response)}")
                await save_message(
                    session_id=session_id, user_id=user_id, role="assistant",
                    content=final_response, agent_steps=agent_steps,
                    tokens_used=tokens, cost_usd=cost,
                    model_used=user_settings.get("model", "gpt-4o"),
                    risk_level=risk, hitl_triggered=hitl_triggered,
                )

            title = None
            if is_first_message:
                title = await _generate_session_title(session_id, user_message)

            await update_session_risk(session_id, risk)
            await log_audit(
                user_id=user_id, session_id=session_id,
                action="chat_complete", risk_level=risk
            )

            logger.info(f"[CHAT] Done — title='{title}' risk={risk}")
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'title': title, 'risk_level': risk})}\n\n"

        except Exception as e:
            logger.error(f"[CHAT] Stream error: {e}", exc_info=True)
            if final_response:
                try:
                    await save_message(
                        session_id=session_id, user_id=user_id, role="assistant",
                        content=final_response, agent_steps=agent_steps,
                        tokens_used=tokens, cost_usd=cost,
                        model_used=user_settings.get("model", "gpt-4o"),
                        risk_level=risk,
                    )
                except Exception:
                    pass
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'title': None, 'risk_level': risk})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{session_id}/messages")
async def get_messages_route(session_id: str, current_user: dict = Depends(get_current_user)):
    messages = await get_session_messages(session_id, current_user["user_id"])
    return {"messages": messages}


@router.post("/hitl/approve")
async def approve_hitl(
    request: HITLApprovalRequest,
    current_user: dict = Depends(get_current_user)
):
    graph = get_graph()
    config = {"configurable": {"thread_id": request.session_id}}
    graph.update_state(config, {"hitl_approved": request.approved, "hitl_required": False})
    return {"status": "approved" if request.approved else "rejected"}