import logging
from datetime import datetime, date, timedelta
from app.db.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def log_symptom(user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("symptom_logs").insert({
        "user_id": user_id,
        "symptom": data["symptom"],
        "severity": data["severity"],
        "body_location": data.get("body_location"),
        "time_of_day": data.get("time_of_day", "unknown"),
        "context_tags": data.get("context_tags", []),
        "notes": data.get("notes", ""),
        "logged_at": data.get("logged_at", datetime.utcnow().isoformat()),
    }).execute()
    return result.data[0] if result.data else {}


async def get_symptom_logs(user_id: str, days: int = 30) -> list:
    client = get_supabase_client()
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    result = (
        client.table("symptom_logs")
        .select("*")
        .eq("user_id", user_id)
        .gte("logged_at", since)
        .order("logged_at", desc=True)
        .execute()
    )
    return result.data or []


async def get_symptom_logs_range(user_id: str, start: str, end: str) -> list:
    client = get_supabase_client()
    result = (
        client.table("symptom_logs")
        .select("*")
        .eq("user_id", user_id)
        .gte("logged_at", start)
        .lte("logged_at", end)
        .order("logged_at", desc=True)
        .execute()
    )
    return result.data or []


async def delete_symptom_log(log_id: str, user_id: str) -> None:
    client = get_supabase_client()
    client.table("symptom_logs").delete().eq("id", log_id).eq("user_id", user_id).execute()


async def get_pattern_reports(user_id: str, limit: int = 4) -> list:
    client = get_supabase_client()
    result = (
        client.table("pattern_reports")
        .select("*")
        .eq("user_id", user_id)
        .order("week_start", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


async def save_pattern_report(user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("pattern_reports").insert({
        "user_id": user_id,
        "week_start": data["week_start"],
        "week_end": data["week_end"],
        "report_content": data["report_content"],
        "patterns": data.get("patterns", []),
        "recommendations": data.get("recommendations", []),
        "severity_trend": data.get("severity_trend", "insufficient_data"),
    }).execute()
    return result.data[0] if result.data else {}


async def get_trend_alerts(user_id: str, unread_only: bool = False) -> list:
    client = get_supabase_client()
    q = client.table("trend_alerts").select("*").eq("user_id", user_id)
    if unread_only:
        q = q.eq("is_read", False)
    result = q.order("created_at", desc=True).limit(10).execute()
    return result.data or []


async def mark_alerts_read(user_id: str) -> None:
    client = get_supabase_client()
    client.table("trend_alerts").update({"is_read": True}).eq("user_id", user_id).execute()


async def get_onboarding_state(user_id: str) -> dict:
    client = get_supabase_client()
    result = client.table("onboarding_state").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else {"completed": False, "step_reached": 0}


async def set_onboarding_complete(user_id: str) -> None:
    client = get_supabase_client()
    client.table("onboarding_state").upsert({
        "user_id": user_id,
        "completed": True,
        "step_reached": 4,
        "completed_at": datetime.utcnow().isoformat(),
    }).execute()
