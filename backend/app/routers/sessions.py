from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.db.sessions import get_user_sessions, create_session, delete_session
from app.db.messages import get_session_messages

router = APIRouter()


@router.get("/")
async def list_sessions(current_user: dict = Depends(get_current_user)):
    sessions = await get_user_sessions(current_user["user_id"])
    return {"sessions": sessions}


@router.post("/")
async def new_session(current_user: dict = Depends(get_current_user)):
    session = await create_session(current_user["user_id"])
    return session


@router.delete("/{session_id}")
async def remove_session(session_id: str, current_user: dict = Depends(get_current_user)):
    await delete_session(session_id, current_user["user_id"])
    return {"success": True}


@router.get("/{session_id}/messages")
async def get_messages(session_id: str, current_user: dict = Depends(get_current_user)):
    """Return all saved messages for a session. Used by the frontend chat history panel."""
    messages = await get_session_messages(session_id, current_user["user_id"])
    return {"messages": messages}