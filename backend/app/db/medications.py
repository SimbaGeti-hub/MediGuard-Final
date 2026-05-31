import logging
from datetime import datetime
from app.db.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def get_medications(user_id: str, active_only: bool = True) -> list:
    client = get_supabase_client()
    q = client.table("medications").select("*").eq("user_id", user_id)
    if active_only:
        q = q.eq("is_active", True)
    return (q.order("created_at", desc=False).execute()).data or []


async def add_medication(user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("medications").insert({
        "user_id": user_id,
        "name": data["name"],
        "generic_name": data.get("generic_name", ""),
        "dosage": data["dosage"],
        "unit": data.get("unit", "mg"),
        "frequency": data["frequency"],
        "times_per_day": data.get("times_per_day", 1),
        "schedule_times": data.get("schedule_times", []),
        "prescribing_doctor": data.get("prescribing_doctor", ""),
        "start_date": data.get("start_date"),
        "end_date": data.get("end_date"),
        "color": data.get("color", "#6366f1"),
        "notes": data.get("notes", ""),
    }).execute()
    return result.data[0] if result.data else {}


async def update_medication(med_id: str, user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("medications").update({
        **data, "updated_at": datetime.utcnow().isoformat()
    }).eq("id", med_id).eq("user_id", user_id).execute()
    return result.data[0] if result.data else {}


async def delete_medication(med_id: str, user_id: str) -> None:
    client = get_supabase_client()
    client.table("medications").update(
        {"is_active": False, "updated_at": datetime.utcnow().isoformat()}
    ).eq("id", med_id).eq("user_id", user_id).execute()


async def log_dose(user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("dose_logs").insert({
        "user_id": user_id,
        "medication_id": data["medication_id"],
        "scheduled_time": data["scheduled_time"],
        "taken_at": data.get("taken_at", datetime.utcnow().isoformat()),
        "status": data.get("status", "taken"),
        "notes": data.get("notes", ""),
    }).execute()
    return result.data[0] if result.data else {}


async def get_dose_logs(user_id: str, days: int = 7) -> list:
    from datetime import timedelta
    client = get_supabase_client()
    since = (datetime.utcnow() - timedelta(days=days)).isoformat()
    result = (
        client.table("dose_logs").select("*, medications(name, dosage, color)")
        .eq("user_id", user_id).gte("scheduled_time", since)
        .order("scheduled_time", desc=True).execute()
    )
    return result.data or []


async def get_adherence_rate(user_id: str, days: int = 7) -> dict:
    logs = await get_dose_logs(user_id, days)
    if not logs:
        return {"rate": 0, "taken": 0, "skipped": 0, "total": 0}
    taken = sum(1 for l in logs if l["status"] == "taken")
    skipped = sum(1 for l in logs if l["status"] in ("skipped", "late"))
    total = len(logs)
    return {
        "rate": round((taken / total) * 100) if total else 0,
        "taken": taken, "skipped": skipped, "total": total,
    }


async def save_interaction_alert(user_id: str, data: dict) -> dict:
    client = get_supabase_client()
    # Don't duplicate alerts for same pair
    existing = client.table("interaction_alerts").select("id").eq(
        "user_id", user_id).eq("drug_a", data["drug_a"]).eq("drug_b", data["drug_b"]).execute()
    if existing.data:
        return existing.data[0]
    result = client.table("interaction_alerts").insert({
        "user_id": user_id, **data
    }).execute()
    return result.data[0] if result.data else {}


async def get_interaction_alerts(user_id: str) -> list:
    client = get_supabase_client()
    return (client.table("interaction_alerts").select("*").eq("user_id", user_id)
            .order("created_at", desc=True).limit(20).execute()).data or []
