import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from app.dependencies import get_current_user
from app.db.consultations import save_report, get_reports, delete_report
from app.db.profiles import get_profile
from app.db.symptoms import get_symptom_logs
from app.db.messages import get_session_messages
from app.db.sessions import get_user_sessions
from app.config import get_settings
from langchain_openai import ChatOpenAI
import json

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()

APPOINTMENT_TYPES = [
    "General Practitioner (GP)", "Specialist Consultation",
    "Emergency / Urgent Care", "Telehealth / Video Call",
    "Follow-up Appointment", "Mental Health", "Dental", "Other"
]


class ReportRequest(BaseModel):
    appointment_type: str
    appointment_date: Optional[str] = None
    doctor_name: Optional[str] = ""
    main_concern: str
    language: Optional[str] = "en"


@router.post("/generate")
async def generate_report(
    req: ReportRequest,
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]

    # Gather all context in parallel
    profile = await get_profile(user_id)
    recent_symptoms = await get_symptom_logs(user_id, days=30)
    sessions = await get_user_sessions(user_id)

    # Get recent chat context (last 3 sessions)
    recent_chat_summaries = []
    for session in sessions[:3]:
        msgs = await get_session_messages(session["id"], user_id)
        if msgs:
            # Get last assistant message as summary
            for m in reversed(msgs):
                if m.get("role") == "assistant" and m.get("content"):
                    snippet = m["content"][:200].replace("\n", " ")
                    recent_chat_summaries.append(
                        f"- Session '{session.get('title','Untitled')}': {snippet}..."
                    )
                    break

    # Build context blocks
    profile_block = ""
    if profile:
        profile_block = f"""
PATIENT PROFILE:
- Name: {profile.get('full_name', 'Not provided')}
- Age: {profile.get('age', 'Not provided')}
- Blood Type: {profile.get('blood_type', 'Unknown')}
- Medical Conditions: {', '.join(profile.get('conditions', [])) or 'None on record'}
- Current Medications: {', '.join(profile.get('medications', [])) or 'None on record'}
- Allergies: {', '.join(profile.get('allergies', [])) or 'None on record'}"""

    symptoms_block = ""
    if recent_symptoms:
        symptom_lines = []
        for s in recent_symptoms[:10]:
            line = f"- {s['symptom']} (severity {s['severity']}/10, {s.get('time_of_day','')}, {s['logged_at'][:10]})"
            if s.get('context_tags'):
                line += f" | {', '.join(s['context_tags'])}"
            symptom_lines.append(line)
        symptoms_block = "\nRECENT SYMPTOMS (last 30 days):\n" + "\n".join(symptom_lines)

    chat_block = ""
    if recent_chat_summaries:
        chat_block = "\nRECENT AI HEALTH CONSULTATIONS:\n" + "\n".join(recent_chat_summaries)

    lang_instruction = ""
    if req.language and req.language != "en":
        lang_names = {
            "es": "Spanish", "fr": "French", "ar": "Arabic", "hi": "Hindi",
            "pt": "Portuguese", "de": "German", "zh": "Chinese (Mandarin)",
            "sw": "Swahili", "ru": "Russian", "ja": "Japanese",
            "bn": "Bengali", "ur": "Urdu", "id": "Indonesian", "ko": "Korean",
            "tr": "Turkish", "vi": "Vietnamese", "it": "Italian",
            "pl": "Polish", "nl": "Dutch", "th": "Thai",
        }
        lang_name = lang_names.get(req.language, req.language.upper())
        lang_instruction = f"\n\nIMPORTANT: Write the entire report in {lang_name}."

    prompt = f"""You are a medical documentation assistant. Generate a professional pre-consultation report for a patient to bring to their doctor.

APPOINTMENT DETAILS:
- Type: {req.appointment_type}
- Date: {req.appointment_date or 'Not specified'}
- Doctor/Clinic: {req.doctor_name or 'Not specified'}
- Main Concern: {req.main_concern}
{profile_block}
{symptoms_block}
{chat_block}

Generate a structured pre-consultation report with these sections:

## Pre-Consultation Summary
Brief 2-3 sentence overview of why the patient is seeking care.

## Current Concern
Detailed description of the main concern, onset, duration, and severity.

## Relevant Symptoms
List any symptoms from their tracking data relevant to this visit.

## Current Medications & Allergies
From their health profile.

## Medical History
Relevant conditions from their profile.

## Questions to Ask the Doctor
5-7 specific, relevant questions the patient should ask based on their concern and history.

## Important Notes for the Doctor
Any patterns, medication interactions, or risk factors worth highlighting.

---
*Generated by MediGuard AI — This report is informational only and not a medical diagnosis.*{lang_instruction}"""

    if not settings.OPENAI_API_KEY:
        raise HTTPException(500, "OpenAI API key not configured")

    async def stream_report():
        try:
            llm = ChatOpenAI(
                model="gpt-4o",
                temperature=0.3,
                streaming=True,
                api_key=settings.OPENAI_API_KEY,
            )
            full_content = ""
            async for chunk in llm.astream(prompt):
                text = chunk.content
                if text:
                    full_content += text
                    yield f"data: {json.dumps({'type': 'chunk', 'content': text})}\n\n"

            # Save to DB
            report_data = {
                "appointment_type": req.appointment_type,
                "appointment_date": req.appointment_date,
                "doctor_name": req.doctor_name,
                "main_concern": req.main_concern,
                "report_content": full_content,
                "report_data": {
                    "profile_snapshot": {
                        "conditions": profile.get("conditions", []) if profile else [],
                        "medications": profile.get("medications", []) if profile else [],
                        "allergies": profile.get("allergies", []) if profile else [],
                    },
                    "symptom_count": len(recent_symptoms),
                    "language": req.language,
                },
            }
            saved = await save_report(user_id, report_data)
            yield f"data: {json.dumps({'type': 'done', 'report_id': saved.get('id')})}\n\n"

        except Exception as e:
            logger.error(f"Report generation error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        stream_report(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/")
async def list_reports(current_user: dict = Depends(get_current_user)):
    reports = await get_reports(current_user["user_id"])
    return {"reports": reports}


@router.delete("/{report_id}")
async def remove_report(
    report_id: str,
    current_user: dict = Depends(get_current_user)
):
    await delete_report(report_id, current_user["user_id"])
    return {"success": True}
