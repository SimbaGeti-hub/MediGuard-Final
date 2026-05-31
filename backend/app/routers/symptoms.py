import logging
from datetime import datetime, timedelta
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.dependencies import get_current_user
from app.db.symptoms import (
    log_symptom, get_symptom_logs, get_symptom_logs_range,
    delete_symptom_log, get_pattern_reports, save_pattern_report,
    get_trend_alerts, mark_alerts_read, get_onboarding_state, set_onboarding_complete
)
from app.config import get_settings
from langchain_openai import ChatOpenAI

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()


class SymptomLogRequest(BaseModel):
    symptom: str
    severity: int
    body_location: Optional[str] = None
    time_of_day: Optional[str] = "unknown"
    context_tags: Optional[List[str]] = []
    notes: Optional[str] = ""
    logged_at: Optional[str] = None


@router.post("/log")
async def log_symptom_route(req: SymptomLogRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    data = req.dict()
    if not data.get("logged_at"):
        data["logged_at"] = datetime.utcnow().isoformat()
    result = await log_symptom(user_id, data)
    return {"success": True, "log": result}


@router.get("/logs")
async def get_logs(days: int = 30, current_user: dict = Depends(get_current_user)):
    logs = await get_symptom_logs(current_user["user_id"], days)
    return {"logs": logs}


@router.delete("/log/{log_id}")
async def delete_log(log_id: str, current_user: dict = Depends(get_current_user)):
    await delete_symptom_log(log_id, current_user["user_id"])
    return {"success": True}


@router.get("/patterns")
async def get_patterns(current_user: dict = Depends(get_current_user)):
    reports = await get_pattern_reports(current_user["user_id"])
    return {"reports": reports}


@router.post("/patterns/generate")
async def generate_pattern_report(current_user: dict = Depends(get_current_user)):
    """Generate AI-powered weekly pattern analysis."""
    user_id = current_user["user_id"]

    # Get last 7 days of logs
    end = datetime.utcnow()
    start = end - timedelta(days=7)
    logs = await get_symptom_logs_range(user_id, start.isoformat(), end.isoformat())

    if len(logs) < 2:
        return {"report": None, "message": "Not enough data — log at least 2 symptoms this week for a pattern analysis."}

    # Build summary for AI
    summary_lines = []
    for log in logs:
        line = f"- {log['symptom']} (severity {log['severity']}/10, {log.get('time_of_day','')}, {log.get('logged_at','')[:10]})"
        if log.get("context_tags"):
            line += f" | context: {', '.join(log['context_tags'])}"
        if log.get("notes"):
            line += f" | notes: {log['notes'][:80]}"
        summary_lines.append(line)

    symptom_counts = Counter(l["symptom"] for l in logs)
    avg_severity = sum(l["severity"] for l in logs) / len(logs)

    prompt = f"""You are a health pattern analyst. Analyze this week's symptom log for a user and provide insights.

SYMPTOM LOG ({len(logs)} entries, {start.date()} to {end.date()}):
{chr(10).join(summary_lines)}

SUMMARY:
- Most frequent: {symptom_counts.most_common(3)}
- Average severity: {avg_severity:.1f}/10
- Total entries: {len(logs)}

Provide a structured analysis with:
1. Key patterns identified (time-based, trigger-based, frequency-based)
2. What these patterns might indicate (educational, not diagnostic)
3. Specific recommendations for next week
4. Whether the overall trend is improving, stable, worsening, or insufficient_data

Keep tone empathetic and educational. Be specific to their actual data. Format with clear sections.
End with: TREND: [improving|stable|worsening|insufficient_data]"""

    try:
        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, api_key=settings.OPENAI_API_KEY)
        from langchain_core.messages import HumanMessage
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        content = response.content

        # Extract trend
        trend = "insufficient_data"
        for t in ["improving", "stable", "worsening"]:
            if f"TREND: {t}" in content.lower() or f"trend: {t}" in content.lower():
                trend = t
                break

        # Build patterns list
        patterns = [{"symptom": s, "count": c, "avg_severity": round(
            sum(l["severity"] for l in logs if l["symptom"] == s) / c, 1
        )} for s, c in symptom_counts.most_common(5)]

        report = await save_pattern_report(user_id, {
            "week_start": start.date().isoformat(),
            "week_end": end.date().isoformat(),
            "report_content": content,
            "patterns": patterns,
            "recommendations": [],
            "severity_trend": trend,
        })
        return {"report": report, "success": True}
    except Exception as e:
        logger.error(f"Pattern generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_alerts(current_user: dict = Depends(get_current_user)):
    alerts = await get_trend_alerts(current_user["user_id"])
    return {"alerts": alerts}


@router.post("/alerts/read")
async def read_alerts(current_user: dict = Depends(get_current_user)):
    await mark_alerts_read(current_user["user_id"])
    return {"success": True}


@router.get("/stats")
async def get_stats(days: int = 30, current_user: dict = Depends(get_current_user)):
    """Return aggregated stats for the health dashboard."""
    logs = await get_symptom_logs(current_user["user_id"], days)
    if not logs:
        return {"stats": {}, "chart_data": [], "top_symptoms": []}

    counts = Counter(l["symptom"] for l in logs)
    by_date: dict = {}
    for log in logs:
        d = log["logged_at"][:10]
        if d not in by_date:
            by_date[d] = {"date": d, "count": 0, "total_severity": 0}
        by_date[d]["count"] += 1
        by_date[d]["total_severity"] += log["severity"]

    chart_data = sorted([
        {"date": d, "count": v["count"], "avg_severity": round(v["total_severity"] / v["count"], 1)}
        for d, v in by_date.items()
    ], key=lambda x: x["date"])

    return {
        "stats": {
            "total_logs": len(logs),
            "avg_severity": round(sum(l["severity"] for l in logs) / len(logs), 1),
            "unique_symptoms": len(counts),
            "days_tracked": len(by_date),
        },
        "chart_data": chart_data[-30:],
        "top_symptoms": [{"symptom": s, "count": c} for s, c in counts.most_common(8)],
    }


@router.get("/onboarding")
async def get_onboarding(current_user: dict = Depends(get_current_user)):
    state = await get_onboarding_state(current_user["user_id"])
    return state


@router.post("/onboarding/complete")
async def complete_onboarding(current_user: dict = Depends(get_current_user)):
    await set_onboarding_complete(current_user["user_id"])
    return {"success": True}
