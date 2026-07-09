from app.db.supabase import get_supabase_client


async def get_user_settings(user_id: str) -> dict:
    client = get_supabase_client()
    result = client.table("user_settings").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else {}


async def upsert_user_settings(user_id: str, settings_data: dict) -> dict:
    client = get_supabase_client()
    result = client.table("user_settings").upsert({"user_id": user_id, **settings_data}).execute()
    return result.data[0] if result.data else {}
