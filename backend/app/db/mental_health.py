from app.db.supabase import get_supabase_client
from datetime import date


async def save_mood_entry(user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("mood_entries").insert({"user_id": user_id, **data}).execute()
    return result.data[0] if result.data else {}


async def get_mood_entries(user_id: str, days: int = 30) -> list:
    client = get_supabase_client()
    result = (
        client.table("mood_entries")
        .select("*")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .limit(days)
        .execute()
    )
    return result.data or []


async def get_mood_entry_today(user_id: str) -> dict:
    client = get_supabase_client()
    today = date.today().isoformat()
    result = (
        client.table("mood_entries")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", today)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else {}


async def save_assessment(user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("mental_assessments").insert({"user_id": user_id, **data}).execute()
    return result.data[0] if result.data else {}


async def get_assessments(user_id: str, assessment_type: str = None) -> list:
    client = get_supabase_client()
    query = client.table("mental_assessments").select("*").eq("user_id", user_id)
    if assessment_type:
        query = query.eq("assessment_type", assessment_type)
    result = query.order("created_at", desc=True).limit(20).execute()
    return result.data or []


async def save_journal_entry(user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("journal_entries").insert({"user_id": user_id, **data}).execute()
    return result.data[0] if result.data else {}


async def get_journal_entries(user_id: str, limit: int = 20) -> list:
    client = get_supabase_client()
    result = (
        client.table("journal_entries")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


async def update_journal_entry(entry_id: str, user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    result = (
        client.table("journal_entries")
        .update(data)
        .eq("id", entry_id)
        .eq("user_id", user_id)
        .execute()
    )
    return result.data[0] if result.data else {}


async def delete_journal_entry(entry_id: str, user_id: str) -> bool:
    client = get_supabase_client()
    client.table("journal_entries").delete().eq("id", entry_id).eq("user_id", user_id).execute()
    return True


async def save_breathing_session(user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("breathing_sessions").insert({"user_id": user_id, **data}).execute()
    return result.data[0] if result.data else {}


async def get_breathing_sessions(user_id: str, limit: int = 10) -> list:
    client = get_supabase_client()
    result = (
        client.table("breathing_sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []
