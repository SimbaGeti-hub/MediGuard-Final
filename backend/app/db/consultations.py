import logging
from app.db.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def save_report(user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("consultation_reports").insert({
        "user_id": user_id,
        "appointment_type": data["appointment_type"],
        "appointment_date": data.get("appointment_date"),
        "doctor_name": data.get("doctor_name", ""),
        "main_concern": data["main_concern"],
        "report_content": data["report_content"],
        "report_data": data.get("report_data", {}),
    }).execute()
    return result.data[0] if result.data else {}


async def get_reports(user_id: str, limit: int = 10) -> list:
    client = get_supabase_client()
    result = (
        client.table("consultation_reports")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return result.data or []


async def delete_report(report_id: str, user_id: str) -> None:
    client = get_supabase_client()
    client.table("consultation_reports").delete()\
        .eq("id", report_id).eq("user_id", user_id).execute()
