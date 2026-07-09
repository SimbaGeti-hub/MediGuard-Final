from app.db.supabase import get_supabase_client


async def get_profile(user_id: str) -> dict:
    client = get_supabase_client()
    result = client.table("health_profiles").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else {}


async def upsert_profile(user_id: str, profile_data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("health_profiles").upsert({"user_id": user_id, **profile_data}).execute()
    return result.data[0] if result.data else {}
