from app.db.supabase import get_supabase_client


async def save_message(
    session_id: str,
    user_id: str,
    role: str,
    content: str,
    agent_steps: list = [],
    tokens_used: int = 0,
    cost_usd: float = 0,
    model_used: str = "",
    risk_level: str = "low",
    hitl_triggered: bool = False,
) -> dict:
    client = get_supabase_client()
    result = client.table("messages").insert({
        "session_id": session_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "agent_steps": agent_steps,
        "tokens_used": tokens_used,
        "cost_usd": cost_usd,
        "model_used": model_used,
        "risk_level": risk_level,
        "hitl_triggered": hitl_triggered,
    }).execute()
    return result.data[0] if result.data else {}


async def get_session_messages(session_id: str, user_id: str) -> list:
    client = get_supabase_client()
    result = (
        client.table("messages")
        .select("*")
        .eq("session_id", session_id)
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    return result.data or []


async def update_message_feedback(message_id: str, rating: int, comment: str = "") -> None:
    client = get_supabase_client()
    client.table("messages").update({"feedback_rating": rating, "feedback_text": comment}).eq("id", message_id).execute()
