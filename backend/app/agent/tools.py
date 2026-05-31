import json
import httpx
from langchain_core.tools import tool
from app.knowledge.medical_kb import search_knowledge_base, DRUG_ALLERGY_CONFLICTS, KNOWN_INTERACTIONS


def _retry_get(url: str, params: dict, max_attempts: int = 3) -> dict:
    for attempt in range(max_attempts):
        try:
            response = httpx.get(url, params=params, timeout=10.0)
            if response.status_code == 200:
                return response.json()
        except Exception:
            import time
            time.sleep(2 ** attempt)
    return {}


@tool
def assess_symptoms(
    symptoms: list[str],
    duration_hours: float = 0,
    severity_1_to_10: int = 5,
    associated_conditions: list[str] = [],
) -> dict:
    """
    Assess reported symptoms and determine urgency level.
    Use this when the user describes physical symptoms.
    """
    symptoms_lower = [s.lower() for s in symptoms]

    EMERGENCY_PATTERNS = {
        "cardiac": ["chest pain", "chest pressure", "chest tightness", "left arm pain", "jaw pain"],
        "stroke": ["face drooping", "arm weakness", "speech difficulty", "sudden headache", "vision loss"],
        "respiratory": ["cannot breathe", "severe shortness of breath", "blue lips", "choking"],
        "allergic": ["throat swelling", "anaphylaxis", "severe hives", "tongue swelling"],
        "neurological": ["worst headache of life", "seizure", "unconscious", "sudden confusion"],
    }

    HIGH_URGENCY = [
        "high fever", "fever above 103", "severe abdominal pain", "coughing blood",
        "blood in urine", "sudden vision changes", "severe dizziness",
    ]

    for emergency_type, keywords in EMERGENCY_PATTERNS.items():
        for kw in keywords:
            for symptom in symptoms_lower:
                if kw in symptom:
                    return {
                        "urgency": "CRITICAL",
                        "emergency_type": emergency_type,
                        "action": "CALL 911 IMMEDIATELY. Do not drive yourself.",
                        "reasoning": f"Symptom '{symptom}' matches emergency pattern: {emergency_type}",
                        "possible_causes": ["Medical emergency — requires immediate professional evaluation"],
                        "do_not_do": ["Do not wait", "Do not drive yourself"],
                    }

    urgency = "low"
    high_urgency_matches = []
    for hu in HIGH_URGENCY:
        for symptom in symptoms_lower:
            if hu in symptom:
                high_urgency_matches.append(symptom)
                urgency = "high"

    if severity_1_to_10 >= 8 and urgency != "high":
        urgency = "high"
    elif severity_1_to_10 >= 6 and urgency == "low":
        urgency = "medium"

    if duration_hours > 72 and urgency == "low":
        urgency = "medium"
    elif duration_hours > 168:
        urgency = "high"

    possible_causes = []
    for symptom in symptoms_lower[:3]:
        kb_results = search_knowledge_base(symptom, max_results=2)
        for result in kb_results:
            if result["title"] not in possible_causes:
                possible_causes.append(result["title"])

    return {
        "urgency": urgency,
        "symptoms_analyzed": symptoms,
        "severity_reported": severity_1_to_10,
        "duration_hours": duration_hours,
        "possible_causes": possible_causes[:5],
        "high_urgency_indicators": high_urgency_matches,
        "recommendation": {
            "high": "Visit urgent care or ER within hours",
            "medium": "Schedule a doctor's appointment within 1-2 days",
            "low": "Monitor symptoms; home care likely appropriate",
        }.get(urgency, "Monitor and consult a doctor if worsening"),
        "when_to_call_911": "If symptoms suddenly worsen, especially chest pain, breathing difficulty, or neurological changes",
    }


@tool
def check_drug_interactions(
    medications: list[str],
    check_against_allergies: list[str] = [],
) -> dict:
    """
    Check for dangerous drug interactions and allergy conflicts using the OpenFDA API.
    Use this when the user mentions multiple medications or asks about drug safety.
    """
    if not medications:
        return {"error": "No medications provided to check"}

    results = {
        "medications_checked": medications,
        "interactions": [],
        "allergy_conflicts": [],
        "warnings": [],
        "source": "OpenFDA + MediGuard Knowledge Base",
    }

    for med in medications[:5]:
        try:
            data = _retry_get(
                "https://api.fda.gov/drug/label.json",
                {"search": f'openfda.brand_name:"{med.split()[0]}" OR openfda.generic_name:"{med.split()[0]}"', "limit": 1},
            )
            if data.get("results"):
                warning = data["results"][0].get("warnings", [""])[0]
                if warning:
                    results["warnings"].append(f"{med}: {warning[:200]}")
        except Exception:
            pass

    for med in medications:
        med_lower = med.lower()
        for allergy in check_against_allergies:
            allergy_lower = allergy.lower()
            for conflict_keyword in DRUG_ALLERGY_CONFLICTS.get(allergy_lower, []):
                if conflict_keyword in med_lower:
                    results["allergy_conflicts"].append({
                        "medication": med,
                        "allergy": allergy,
                        "severity": "HIGH",
                        "recommendation": f"Do NOT take {med} — conflicts with {allergy} allergy. Consult your doctor immediately.",
                    })

    for i, med1 in enumerate(medications):
        for med2 in medications[i + 1:]:
            key = tuple(sorted([med1.lower().split()[0], med2.lower().split()[0]]))
            if key in KNOWN_INTERACTIONS:
                results["interactions"].append({
                    "drug1": med1,
                    "drug2": med2,
                    **KNOWN_INTERACTIONS[key],
                })

    results["safe"] = len(results["interactions"]) == 0 and len(results["allergy_conflicts"]) == 0
    results["summary"] = (
        "No major interactions detected. Always confirm with your pharmacist."
        if results["safe"]
        else "Interactions or conflicts detected — consult your doctor."
    )
    return results


@tool
def retrieve_medical_knowledge(
    query: str,
    topic_category: str = "general",
    max_results: int = 3,
) -> dict:
    """
    Search the medical knowledge base for relevant health information (Agentic RAG).
    The agent decides WHEN to retrieve and WHAT query to use.
    """
    results = search_knowledge_base(query, category=topic_category, max_results=max_results)
    if not results:
        return {
            "results": [],
            "found": False,
            "suggestion": f"No results for '{query}'. Try broader terms.",
        }
    return {
        "query": query,
        "found": True,
        "results": results,
        "result_count": len(results),
        "note": "Information sourced from medical knowledge base. Always verify with healthcare provider.",
    }


@tool
def find_care_level(
    urgency: str,
    symptoms: list[str],
    has_primary_care_doctor: bool = True,
    insurance_status: str = "unknown",
    location_type: str = "urban",
) -> dict:
    """
    Determine the most appropriate level of care for the user's situation.
    Use this after assess_symptoms to give concrete next-step recommendations.
    """
    CARE_LEVELS = {
        "critical": {
            "setting": "Emergency Services (911)",
            "timeframe": "IMMEDIATELY — call now",
            "description": "This is a life-threatening emergency. Call 911 immediately.",
            "tips": ["Call 911 — don't drive yourself", "Stay calm, follow dispatcher instructions"],
        },
        "high": {
            "setting": "Emergency Room (ER)",
            "timeframe": "Within 1-2 hours",
            "description": "Your symptoms require prompt evaluation. Go to the nearest ER.",
            "tips": ["Go to nearest ER", "Bring ID and insurance card", "Write down symptoms"],
        },
        "medium": {
            "setting": "Urgent Care Center or Primary Care",
            "timeframe": "Within 24-48 hours",
            "description": "Your symptoms should be evaluated soon but this is not an immediate emergency.",
            "alternatives": ["Telehealth visit (fastest)", "Urgent care center (walk-in)", "Primary care"],
        },
        "low": {
            "setting": "Home Care or Scheduled Doctor Visit",
            "timeframe": "Monitor for 24-48 hours",
            "description": "Your symptoms can likely be managed at home.",
            "home_care_tips": ["Rest and stay hydrated", "OTC treatments as appropriate"],
            "warning_signs": ["Symptoms that suddenly worsen", "Fever above 103F"],
        },
    }

    care_info = CARE_LEVELS.get(urgency.lower(), CARE_LEVELS["low"])

    if insurance_status == "uninsured":
        care_info["uninsured_resources"] = [
            "Federally Qualified Health Centers (FQHCs) offer sliding scale fees",
            "Emergency Medicaid may cover emergency services",
        ]

    return {
        "recommended_care": care_info,
        "urgency_level": urgency,
        "symptoms_considered": symptoms,
        "disclaimer": "This is a general recommendation. Call your doctor if you are unsure.",
    }


@tool
def update_health_profile(update_type: str, value: str, action: str = "add") -> dict:
    """
    Update the user's health profile with information shared during the conversation.
    Use when the user reveals new conditions, medications, or allergies.
    """
    valid_types = ["condition", "medication", "allergy", "age", "blood_type"]
    if update_type not in valid_types:
        return {"success": False, "error": f"Invalid update_type. Must be one of: {valid_types}"}
    return {
        "success": True,
        "update_type": update_type,
        "value": value,
        "action": action,
        "message": f"Successfully {action}ed '{value}' to your {update_type} list.",
        "__update_profile": True,
    }


ALL_TOOLS = {
    "tool_assess_symptoms": assess_symptoms,
    "tool_drug_interactions": check_drug_interactions,
    "tool_medical_knowledge": retrieve_medical_knowledge,
    "tool_find_care_level": find_care_level,
    "tool_update_health_profile": update_health_profile,
}


def get_enabled_tools(tool_settings: dict) -> list:
    return [tool for key, tool in ALL_TOOLS.items() if tool_settings.get(key, True)]
