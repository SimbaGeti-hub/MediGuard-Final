from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.db.settings_db import get_user_settings, upsert_user_settings

router = APIRouter()


@router.get("/")
async def get_settings(current_user: dict = Depends(get_current_user)):
    s = await get_user_settings(current_user["user_id"])
    return {"settings": s}


@router.put("/")
async def update_settings(data: dict, current_user: dict = Depends(get_current_user)):
    s = await upsert_user_settings(current_user["user_id"], data)
    return {"settings": s}
