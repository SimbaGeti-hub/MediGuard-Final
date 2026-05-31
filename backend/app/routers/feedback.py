from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.db.messages import update_message_feedback
from app.db.supabase import get_supabase_client

router = APIRouter()


@router.post("/")
async def submit_feedback(data: dict, current_user: dict = Depends(get_current_user)):
    message_id = data.get("message_id")
    rating = data.get("rating")
    comment = data.get("comment", "")
    if not message_id or not rating:
        return {"error": "message_id and rating required"}
    await update_message_feedback(message_id, rating, comment)
    try:
        client = get_supabase_client()
        client.table("feedback").insert({
            "message_id": message_id,
            "session_id": data.get("session_id"),
            "user_id": current_user["user_id"],
            "rating": rating,
            "comment": comment,
        }).execute()
    except Exception:
        pass
    return {"success": True}
