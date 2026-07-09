MEDICAL_KB = [
    {
        "id": "hypertension_01",
        "title": "Hypertension (High Blood Pressure)",
        "category": "conditions",
        "content": "Hypertension is a chronic condition where blood pressure is persistently elevated (>=130/80 mmHg). Often called the 'silent killer' because it has no symptoms until serious damage occurs. Managed with lifestyle changes (diet, exercise, stress reduction) and medications (ACE inhibitors, beta-blockers, diuretics). Target BP for most adults is below 130/80 mmHg.",
        "keywords": ["hypertension", "high blood pressure", "bp", "systolic", "diastolic"],
        "urgency_trigger": ["severe headache", "vision changes", "nosebleed"],
    },
    {
        "id": "diabetes_01",
        "title": "Type 2 Diabetes",
        "category": "conditions",
        "content": "Type 2 diabetes occurs when the body doesn't use insulin properly. Symptoms include frequent urination, excessive thirst, blurred vision, slow-healing wounds, and fatigue. Managed with diet, exercise, blood glucose monitoring, and medications (metformin is typically first-line). A1C target is usually below 7%.",
        "keywords": ["diabetes", "type 2", "blood sugar", "glucose", "insulin", "a1c", "metformin"],
        "urgency_trigger": ["blood sugar above 400", "diabetic ketoacidosis"],
    },
    {
        "id": "chest_pain_01",
        "title": "Chest Pain — Causes and Emergency Signs",
        "category": "symptoms",
        "content": "Chest pain ranges from benign (muscle strain, acid reflux) to life-threatening (heart attack, pulmonary embolism). EMERGENCY signs: pressure or squeezing sensation, pain radiating to left arm or jaw, sweating, nausea, shortness of breath. These require immediate 911 call. Non-emergency: sharp pain worsening with breathing (may be costochondritis), burning after eating (GERD).",
        "keywords": ["chest pain", "chest pressure", "heart attack", "cardiac", "angina"],
        "urgency_trigger": ["chest pain", "pressure", "left arm", "jaw pain"],
    },
    {
        "id": "mental_health_01",
        "title": "Depression and Anxiety",
        "category": "conditions",
        "content": "Depression and anxiety are among the most common mental health conditions. Depression: persistent sadness, loss of interest, fatigue. Anxiety: excessive worry, restlessness, physical symptoms. Both are highly treatable with therapy (CBT is gold standard), medication (SSRIs), and lifestyle changes. If experiencing thoughts of self-harm, seek immediate help: call 988.",
        "keywords": ["depression", "anxiety", "mental health", "sad", "worry", "panic"],
        "urgency_trigger": ["self-harm", "suicidal", "want to die"],
    },
    {
        "id": "asthma_01",
        "title": "Asthma Management",
        "category": "conditions",
        "content": "Asthma is a chronic condition causing airway inflammation and breathing difficulty. Triggers: allergens, cold air, exercise, smoke, stress. Management: rescue inhaler (albuterol) for attacks, controller medications (inhaled corticosteroids) for daily prevention. Warning signs of severe attack: not responding to rescue inhaler, blue lips, unable to speak full sentences — call 911.",
        "keywords": ["asthma", "inhaler", "wheeze", "breathing", "albuterol", "shortness of breath"],
        "urgency_trigger": ["not responding to inhaler", "blue lips"],
    },
    {
        "id": "stroke_01",
        "title": "Stroke — FAST Recognition",
        "category": "emergency",
        "content": "Stroke occurs when blood supply to part of the brain is cut off. Use FAST: Face drooping, Arm weakness, Speech difficulty, Time to call 911. Every minute counts — brain tissue dies rapidly without blood flow. Note the time symptoms started — crucial for treatment decisions.",
        "keywords": ["stroke", "face droop", "arm weakness", "speech", "fast", "tia"],
        "urgency_trigger": ["face drooping", "arm weakness", "speech difficulty"],
    },
    {
        "id": "metformin_01",
        "title": "Metformin — Medication Guide",
        "category": "medications",
        "content": "Metformin is the first-line medication for type 2 diabetes. Works by reducing glucose production in the liver and improving insulin sensitivity. Common side effects: GI upset, nausea, diarrhea (usually temporary — take with food). Rare but serious: lactic acidosis (stop if kidney function declines). Does not cause low blood sugar when used alone.",
        "keywords": ["metformin", "glucophage", "diabetes medication"],
        "urgency_trigger": ["lactic acidosis", "severe stomach pain"],
    },
    {
        "id": "preventive_care_01",
        "title": "Preventive Care Screenings by Age",
        "category": "general",
        "content": "Recommended screenings: Blood pressure (every 2 years), Cholesterol (every 5 years from age 35 men, 45 women), Colorectal cancer (starting at 45), Breast cancer mammogram (every 1-2 years from age 40-50), Cervical cancer Pap smear (every 3 years from age 21), Diabetes (every 3 years if overweight).",
        "keywords": ["screening", "preventive", "mammogram", "colonoscopy", "checkup"],
        "urgency_trigger": [],
    },
]

DRUG_ALLERGY_CONFLICTS = {
    "penicillin": ["amoxicillin", "ampicillin", "augmentin", "piperacillin"],
    "sulfa": ["sulfamethoxazole", "trimethoprim", "bactrim", "sulfadiazine"],
    "aspirin": ["ibuprofen", "naproxen", "aspirin", "nsaid", "advil", "aleve"],
    "codeine": ["codeine", "morphine", "oxycodone", "hydrocodone", "tramadol"],
}

KNOWN_INTERACTIONS = {
    ("warfarin", "aspirin"): {
        "severity": "HIGH",
        "description": "Increased bleeding risk when warfarin and aspirin are combined.",
        "recommendation": "Avoid combination unless specifically directed by physician.",
    },
    ("metformin", "alcohol"): {
        "severity": "MODERATE",
        "description": "Alcohol increases risk of lactic acidosis with metformin.",
        "recommendation": "Avoid excessive alcohol consumption while taking metformin.",
    },
    ("ssri", "maoi"): {
        "severity": "CRITICAL",
        "description": "Potentially fatal serotonin syndrome when SSRIs are combined with MAOIs.",
        "recommendation": "Never combine. Allow 14-day washout between medications.",
    },
    ("lisinopril", "potassium"): {
        "severity": "MODERATE",
        "description": "ACE inhibitors like lisinopril increase potassium levels.",
        "recommendation": "Monitor potassium levels regularly.",
    },
}


def search_knowledge_base(query: str, category: str = "general", max_results: int = 3) -> list:
    query_lower = query.lower()
    scored = []
    for article in MEDICAL_KB:
        score = 0
        for kw in article["keywords"]:
            if kw in query_lower:
                score += 3
        if any(w in article["title"].lower() for w in query_lower.split()):
            score += 2
        score += sum(1 for w in query_lower.split() if w in article["content"].lower() and len(w) > 3)
        if category != "general" and article["category"] == category:
            score += 1
        if score > 0:
            scored.append((score, article))
    scored.sort(reverse=True, key=lambda x: x[0])
    return [
        {"title": a["title"], "content": a["content"], "category": a["category"], "relevance_score": s}
        for s, a in scored[:max_results]
    ]
