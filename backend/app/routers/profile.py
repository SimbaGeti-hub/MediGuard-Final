from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.db.profiles import get_profile, upsert_profile

router = APIRouter()


@router.get("/")
async def get_user_profile(current_user: dict = Depends(get_current_user)):
    profile = await get_profile(current_user["user_id"])
    return {"profile": profile}


@router.put("/")
async def update_profile(data: dict, current_user: dict = Depends(get_current_user)):
    profile = await upsert_profile(current_user["user_id"], data)
    return {"profile": profile}
