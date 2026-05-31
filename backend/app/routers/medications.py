import logging
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.dependencies import get_current_user
from app.db.medications import (
    get_medications, add_medication, update_medication, delete_medication,
    log_dose, get_dose_logs, get_adherence_rate,
    save_interaction_alert, get_interaction_alerts,
)

router = APIRouter()
logger = logging.getLogger(__name__)


class MedicationRequest(BaseModel):
    name: str
    generic_name: Optional[str] = ""
    dosage: str
    unit: Optional[str] = "mg"
    frequency: str
    times_per_day: Optional[int] = 1
    schedule_times: Optional[List[str]] = []
    prescribing_doctor: Optional[str] = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    color: Optional[str] = "#6366f1"
    notes: Optional[str] = ""


class DoseLogRequest(BaseModel):
    medication_id: str
    scheduled_time: str
    status: Optional[str] = "taken"
    notes: Optional[str] = ""


@router.get("/")
async def list_medications(current_user: dict = Depends(get_current_user)):
    meds = await get_medications(current_user["user_id"])
    return {"medications": meds}


@router.post("/")
async def create_medication(req: MedicationRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    med = await add_medication(user_id, req.dict())

    # Auto-check interactions with all existing meds
    existing = await get_medications(user_id)
    interactions_found = []
    for existing_med in existing:
        if existing_med["id"] == med.get("id"):
            continue
        interaction = await check_drug_interaction(req.name, existing_med["name"])
        if interaction:
            await save_interaction_alert(user_id, {
                "drug_a": req.name,
                "drug_b": existing_med["name"],
                "severity": interaction.get("severity", "moderate"),
                "description": interaction.get("description", ""),
            })
            interactions_found.append(interaction)

    return {"medication": med, "interactions": interactions_found}


async def check_drug_interaction(drug_a: str, drug_b: str) -> Optional[dict]:
    """Check OpenFDA for drug interactions."""
    try:
        url = f"https://api.fda.gov/drug/label.json?search=drug_interactions:{drug_a}+AND+drug_interactions:{drug_b}&limit=1"
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("results"):
                    interactions = data["results"][0].get("drug_interactions", [""])
                    desc = interactions[0][:300] if interactions else ""
                    if desc:
                        severity = "severe" if any(w in desc.lower() for w in ["avoid", "contraindicated", "fatal", "death"]) \
                            else "moderate" if any(w in desc.lower() for w in ["caution", "monitor", "increase", "decrease"]) \
                            else "minor"
                        return {"drug_a": drug_a, "drug_b": drug_b, "severity": severity, "description": desc}
    except Exception as e:
        logger.warning(f"FDA interaction check failed: {e}")
    return None


@router.put("/{med_id}")
async def update_med(med_id: str, req: MedicationRequest, current_user: dict = Depends(get_current_user)):
    med = await update_medication(med_id, current_user["user_id"], req.dict())
    return {"medication": med}


@router.delete("/{med_id}")
async def remove_medication(med_id: str, current_user: dict = Depends(get_current_user)):
    await delete_medication(med_id, current_user["user_id"])
    return {"success": True}


@router.post("/dose")
async def record_dose(req: DoseLogRequest, current_user: dict = Depends(get_current_user)):
    log = await log_dose(current_user["user_id"], req.dict())
    return {"log": log}


@router.get("/doses")
async def get_doses(days: int = 7, current_user: dict = Depends(get_current_user)):
    logs = await get_dose_logs(current_user["user_id"], days)
    return {"logs": logs}


@router.get("/adherence")
async def adherence(days: int = 7, current_user: dict = Depends(get_current_user)):
    rate = await get_adherence_rate(current_user["user_id"], days)
    return rate


@router.get("/interactions")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    alerts = await get_interaction_alerts(current_user["user_id"])
    return {"alerts": alerts}


@router.post("/check-interaction")
async def check_interaction(body: dict, current_user: dict = Depends(get_current_user)):
    drug_a = body.get("drug_a", "")
    drug_b = body.get("drug_b", "")
    if not drug_a or not drug_b:
        raise HTTPException(400, "Both drug names required")
    result = await check_drug_interaction(drug_a, drug_b)
    return {"interaction": result}
