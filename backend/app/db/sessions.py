import logging
from app.db.supabase import get_supabase_client

logger = logging.getLogger(__name__)


def create_session_sync(user_id: str, title: str = "New Conversation") -> dict:
    client = get_supabase_client()
    result = client.table("chat_sessions").insert({"user_id": user_id, "title": title}).execute()
    return result.data[0] if result.data else {}


async def create_session(user_id: str, title: str = "New Conversation") -> dict:
    return create_session_sync(user_id, title)


async def get_user_sessions(user_id: str) -> list:
    client = get_supabase_client()
    result = (
        client.table("chat_sessions")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_archived", False)
        .order("updated_at", desc=True)
        .execute()
    )
    return result.data or []


async def update_session_title(session_id: str, title: str) -> None:
    """Update the session title in Supabase — sync client wrapped in async."""
    try:
        client = get_supabase_client()
        result = client.table("chat_sessions").update({"title": title}).eq("id", session_id).execute()
        logger.info(f"[DB] update_session_title: session={session_id} title='{title}' rows={len(result.data or [])}")
    except Exception as e:
        logger.error(f"[DB] update_session_title FAILED: {e}")
        raise


async def update_session_risk(session_id: str, risk_level: str) -> None:
    """Update session risk_level."""
    try:
        client = get_supabase_client()
        client.table("chat_sessions").update({"risk_level": risk_level, "updated_at": "now()"}).eq("id", session_id).execute()
    except Exception as e:
        logger.error(f"[DB] update_session_risk FAILED: {e}")


async def delete_session(session_id: str, user_id: str) -> None:
    client = get_supabase_client()
    client.table("chat_sessions").delete().eq("id", session_id).eq("user_id", user_id).execute()
