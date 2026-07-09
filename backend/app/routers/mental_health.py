from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user
from app.db.mental_health import (
    save_mood_entry, get_mood_entries, get_mood_entry_today,
    save_assessment, get_assessments,
    save_journal_entry, get_journal_entries, update_journal_entry, delete_journal_entry,
    save_breathing_session, get_breathing_sessions,
)

router = APIRouter()


# ── Mood tracking ──────────────────────────────────────────────

@router.post("/mood")
async def log_mood(data: dict, current_user: dict = Depends(get_current_user)):
    entry = await save_mood_entry(current_user["user_id"], data)
    return {"entry": entry}


@router.get("/mood")
async def list_mood(days: int = 30, current_user: dict = Depends(get_current_user)):
    entries = await get_mood_entries(current_user["user_id"], days)
    return {"entries": entries}


@router.get("/mood/today")
async def today_mood(current_user: dict = Depends(get_current_user)):
    entry = await get_mood_entry_today(current_user["user_id"])
    return {"entry": entry}


# ── Assessments ────────────────────────────────────────────────

@router.post("/assessment")
async def create_assessment(data: dict, current_user: dict = Depends(get_current_user)):
    assessment = await save_assessment(current_user["user_id"], data)
    return {"assessment": assessment}


@router.get("/assessment")
async def list_assessments(type: str = None, current_user: dict = Depends(get_current_user)):
    assessments = await get_assessments(current_user["user_id"], type)
    return {"assessments": assessments}


# ── Journal ────────────────────────────────────────────────────

@router.post("/journal")
async def create_journal(data: dict, current_user: dict = Depends(get_current_user)):
    entry = await save_journal_entry(current_user["user_id"], data)
    return {"entry": entry}


@router.get("/journal")
async def list_journal(limit: int = 20, current_user: dict = Depends(get_current_user)):
    entries = await get_journal_entries(current_user["user_id"], limit)
    return {"entries": entries}


@router.put("/journal/{entry_id}")
async def edit_journal(entry_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    entry = await update_journal_entry(entry_id, current_user["user_id"], data)
    return {"entry": entry}


@router.delete("/journal/{entry_id}")
async def remove_journal(entry_id: str, current_user: dict = Depends(get_current_user)):
    await delete_journal_entry(entry_id, current_user["user_id"])
    return {"success": True}


# ── Breathing sessions ─────────────────────────────────────────

@router.post("/breathing")
async def log_breathing(data: dict, current_user: dict = Depends(get_current_user)):
    session = await save_breathing_session(current_user["user_id"], data)
    return {"session": session}


@router.get("/breathing")
async def list_breathing(limit: int = 10, current_user: dict = Depends(get_current_user)):
    sessions = await get_breathing_sessions(current_user["user_id"], limit)
    return {"sessions": sessions}
