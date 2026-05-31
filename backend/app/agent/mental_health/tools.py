"""
Phase 2 — Mental Health Agent Tools
PHQ-9, GAD-7 scoring, crisis detection, coping recommendations
"""
from langchain_core.tools import tool


PHQ9_QUESTIONS = [
    "Little interest or pleasure in doing things",
    "Feeling down, depressed, or hopeless",
    "Trouble falling or staying asleep, or sleeping too much",
    "Feeling tired or having little energy",
    "Poor appetite or overeating",
    "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
    "Trouble concentrating on things, such as reading the newspaper or watching television",
    "Moving or speaking so slowly that other people could have noticed — or the opposite, being so fidgety or restless that you have been moving around a lot more than usual",
    "Thoughts that you would be better off dead, or of hurting yourself in some way",
]

GAD7_QUESTIONS = [
    "Feeling nervous, anxious, or on edge",
    "Not being able to stop or control worrying",
    "Worrying too much about different things",
    "Trouble relaxing",
    "Being so restless that it's hard to sit still",
    "Becoming easily annoyed or irritable",
    "Feeling afraid, as if something awful might happen",
]

PHQ9_SEVERITY = [
    (0, 4,  "minimal",          "Your responses suggest minimal depressive symptoms."),
    (5, 9,  "mild",             "Your responses suggest mild depression. Self-care strategies and monitoring are recommended."),
    (10, 14,"moderate",         "Your responses suggest moderate depression. Speaking with a mental health professional is recommended."),
    (15, 19,"moderately_severe","Your responses suggest moderately severe depression. Professional evaluation is strongly recommended."),
    (20, 27,"severe",           "Your responses suggest severe depression. Please seek professional help promptly."),
]

GAD7_SEVERITY = [
    (0,  4, "minimal",  "Minimal anxiety symptoms."),
    (5,  9, "mild",     "Mild anxiety. Self-management strategies may help."),
    (10, 14,"moderate", "Moderate anxiety. Consider speaking with a healthcare professional."),
    (15, 21,"severe",   "Severe anxiety. Professional evaluation is strongly recommended."),
]


def _score_phq9(answers: list[int]) -> dict:
    score = sum(answers)
    for lo, hi, severity, interpretation in PHQ9_SEVERITY:
        if lo <= score <= hi:
            recs = ["Practice regular self-care (sleep, exercise, nutrition)"]
            if score >= 5:
                recs.append("Consider talking to a trusted person about how you feel")
            if score >= 10:
                recs.append("Speak with a primary care doctor or mental health professional")
            if score >= 15:
                recs.append("Seek professional mental health evaluation within the week")
            if answers[-1] > 0:  # Q9 — self harm
                recs.insert(0, "PRIORITY: Please speak with a mental health professional or call 988 today")
            return {"score": score, "severity": severity, "interpretation": interpretation, "recommendations": recs}
    return {"score": score, "severity": "severe", "interpretation": "Please seek professional evaluation.", "recommendations": []}


def _score_gad7(answers: list[int]) -> dict:
    score = sum(answers)
    for lo, hi, severity, interpretation in GAD7_SEVERITY:
        if lo <= score <= hi:
            recs = ["Practice mindfulness or relaxation techniques daily"]
            if score >= 5:
                recs.append("Reduce caffeine and screen time before bed")
            if score >= 10:
                recs.append("Speak with a healthcare provider about anxiety treatment options")
            if score >= 15:
                recs.append("Seek professional mental health evaluation soon")
            return {"score": score, "severity": severity, "interpretation": interpretation, "recommendations": recs}
    return {"score": score, "severity": "severe", "interpretation": "Please seek professional evaluation.", "recommendations": []}


@tool
def score_mental_assessment(assessment_type: str, answers: list[int]) -> dict:
    """
    Score a standardised mental health assessment (PHQ-9 or GAD-7).
    PHQ-9: 9 answers, each 0-3. GAD-7: 7 answers, each 0-3.
    Use this when the user has completed a mental health questionnaire.

    Args:
        assessment_type: 'PHQ-9' or 'GAD-7'
        answers: List of integer scores (0=Not at all, 1=Several days, 2=More than half, 3=Nearly every day)
    """
    if assessment_type == "PHQ-9":
        if len(answers) != 9:
            return {"error": "PHQ-9 requires exactly 9 answers"}
        result = _score_phq9(answers)
        result["assessment_type"] = "PHQ-9"
        result["questions"] = PHQ9_QUESTIONS
        result["answers"] = answers
        result["crisis_flag"] = answers[-1] > 0
        return result

    elif assessment_type == "GAD-7":
        if len(answers) != 7:
            return {"error": "GAD-7 requires exactly 7 answers"}
        result = _score_gad7(answers)
        result["assessment_type"] = "GAD-7"
        result["questions"] = GAD7_QUESTIONS
        result["answers"] = answers
        result["crisis_flag"] = False
        return result

    return {"error": f"Unknown assessment type: {assessment_type}. Use 'PHQ-9' or 'GAD-7'"}


@tool
def assess_crisis_risk(
    responses: dict,
    mood_score: int = 5,
    has_support: bool = True,
) -> dict:
    """
    Assess mental health crisis risk level based on user responses.
    Use when a user expresses thoughts of self-harm, hopelessness, or crisis.

    Args:
        responses: Dict of crisis indicator responses (e.g. {"self_harm_thoughts": true, "plan": false})
        mood_score: Current mood 1-10
        has_support: Whether user has people they can reach out to
    """
    self_harm = responses.get("self_harm_thoughts", False)
    has_plan = responses.get("plan", False)
    has_means = responses.get("means", False)
    recent_attempt = responses.get("recent_attempt", False)
    hopelessness = responses.get("feels_hopeless", False)
    isolation = responses.get("feels_isolated", False)

    if recent_attempt or (self_harm and has_plan and has_means):
        risk_level = "critical"
    elif self_harm and has_plan:
        risk_level = "high"
    elif self_harm or (hopelessness and mood_score <= 3):
        risk_level = "medium"
    else:
        risk_level = "low"

    resources = [
        {"name": "988 Suicide & Crisis Lifeline", "contact": "Call or text 988", "available": "24/7"},
        {"name": "Crisis Text Line", "contact": "Text HOME to 741741", "available": "24/7"},
        {"name": "International Association for Suicide Prevention", "contact": "https://www.iasp.info/resources/Crisis_Centres/", "available": "Global directory"},
    ]

    safety_plan = None
    if risk_level in ("medium", "high", "critical"):
        safety_plan = {
            "warning_signs": "Notice when thoughts start escalating",
            "coping_strategies": ["Deep breathing", "Call a trusted person", "Go to a safe place"],
            "support_contacts": "Identify 2-3 people you can call",
            "professional": "Contact your therapist or go to nearest ER if in immediate danger",
        }

    return {
        "risk_level": risk_level,
        "immediate_action_required": risk_level in ("high", "critical"),
        "resources": resources,
        "safety_plan": safety_plan,
        "message": {
            "critical": "Please call 988 or go to your nearest emergency room right now. You matter and help is available.",
            "high": "Please reach out to someone you trust or call 988 right now. You don't have to face this alone.",
            "medium": "I'm concerned about you. Please consider calling 988 or talking to a mental health professional today.",
            "low": "Thank you for sharing. It sounds like you're going through a difficult time. Let's talk about some support options.",
        }.get(risk_level, ""),
    }


@tool
def get_coping_strategies(
    concern: str,
    severity: str = "mild",
    preference: str = "any",
) -> dict:
    """
    Recommend evidence-based coping strategies for mental health concerns.

    Args:
        concern: Type of concern ('anxiety', 'depression', 'stress', 'sleep', 'anger', 'grief', 'loneliness')
        severity: 'mild', 'moderate', or 'severe'
        preference: 'quick' (under 5 min), 'physical', 'cognitive', 'social', or 'any'
    """
    STRATEGIES = {
        "anxiety": {
            "quick": [
                {"name": "Box Breathing (4-4-4-4)", "duration": "3 min", "description": "Inhale 4 counts, hold 4, exhale 4, hold 4. Repeat 4 times.", "evidence": "Activates parasympathetic nervous system"},
                {"name": "5-4-3-2-1 Grounding", "duration": "2 min", "description": "Name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste.", "evidence": "Breaks anxious thought loops"},
            ],
            "cognitive": [
                {"name": "Thought Record", "duration": "10 min", "description": "Write the anxious thought, evidence for and against it, then a balanced perspective.", "evidence": "Core CBT technique"},
                {"name": "Worry Postponement", "duration": "Ongoing", "description": "Schedule a 15-min 'worry time' daily. When worries arise outside it, defer them.", "evidence": "Reduces rumination cycles"},
            ],
            "physical": [
                {"name": "Progressive Muscle Relaxation", "duration": "15 min", "description": "Tense and release each muscle group from feet to face.", "evidence": "Reduces physiological anxiety"},
                {"name": "Cold Water Splash", "duration": "30 sec", "description": "Splash cold water on face or hold ice — activates the dive reflex to slow heart rate.", "evidence": "DBT TIPP technique"},
            ],
        },
        "depression": {
            "quick": [
                {"name": "Behavioural Activation", "duration": "10 min", "description": "Do one small, achievable activity that used to bring pleasure, even if you don't feel like it.", "evidence": "Primary CBT for depression"},
                {"name": "Gratitude Anchor", "duration": "3 min", "description": "Write 3 specific things you are grateful for today — be concrete, not general.", "evidence": "Increases positive affect"},
            ],
            "physical": [
                {"name": "10-Minute Walk", "duration": "10 min", "description": "Walk outside if possible. Daylight and movement are among the most evidence-backed depression interventions.", "evidence": "Equivalent to moderate antidepressant dose"},
                {"name": "Cold Shower", "duration": "3 min", "description": "Brief cold water immersion increases norepinephrine and endorphins.", "evidence": "Preliminary clinical evidence"},
            ],
            "social": [
                {"name": "Connection Call", "duration": "15 min", "description": "Call or message one person — not to discuss how you feel, just to connect.", "evidence": "Social connection is the strongest buffer against depression"},
            ],
        },
        "stress": {
            "quick": [
                {"name": "4-7-8 Breathing", "duration": "4 min", "description": "Inhale 4 counts, hold 7, exhale 8. 4 cycles.", "evidence": "Activates relaxation response"},
                {"name": "Priority Reset", "duration": "5 min", "description": "Write everything stressing you. Circle the ONE thing within your control today.", "evidence": "Reduces overwhelm via agency restoration"},
            ],
            "physical": [
                {"name": "Shaking/Movement", "duration": "5 min", "description": "Shake your hands, shoulders, then whole body for 2 minutes to discharge stress hormones.", "evidence": "Somatic stress release technique"},
            ],
        },
        "sleep": {
            "cognitive": [
                {"name": "Sleep Restriction Therapy", "duration": "Weeks", "description": "Temporarily restrict time in bed to build sleep drive. Consult a provider before starting.", "evidence": "Most effective treatment for chronic insomnia"},
                {"name": "Stimulus Control", "duration": "Ongoing", "description": "Only use bed for sleep and sex. Get up if not asleep in 20 minutes.", "evidence": "Core CBT-I technique"},
            ],
            "quick": [
                {"name": "4-7-8 Breathing", "duration": "4 min", "description": "Slows heart rate and reduces cortisol to prepare for sleep.", "evidence": "Promotes relaxation response"},
                {"name": "Body Scan", "duration": "10 min", "description": "Slowly move attention through each body part from toes to head, releasing tension.", "evidence": "MBSR technique for sleep onset"},
            ],
        },
        "grief": {
            "any": [
                {"name": "Grief Journaling", "duration": "20 min", "description": "Write about your loss, memories, what you miss, and what you're feeling — without editing yourself.", "evidence": "Expressive writing reduces grief intensity"},
                {"name": "Continuing Bonds", "duration": "Ongoing", "description": "Find healthy ways to maintain connection (photos, rituals, speaking about them) rather than 'moving on'.", "evidence": "Modern grief therapy approach"},
                {"name": "Grief Support Group", "duration": "Ongoing", "description": "Connecting with others who have experienced similar losses is one of the most effective grief interventions.", "evidence": "Strong evidence base for peer support"},
            ],
        },
    }

    concern_lower = concern.lower()
    matched = None
    for key in STRATEGIES:
        if key in concern_lower:
            matched = key
            break

    if not matched:
        matched = "stress"

    strategies = STRATEGIES[matched]
    all_strategies = []
    for pref_key, strats in strategies.items():
        all_strategies.extend(strats)

    if preference != "any" and preference in strategies:
        selected = strategies[preference]
    else:
        selected = all_strategies[:4]

    return {
        "concern": concern,
        "severity": severity,
        "strategies": selected,
        "professional_note": "These are evidence-based self-help strategies. For moderate to severe symptoms, please also consult a mental health professional.",
        "crisis_reminder": "If you are in crisis or having thoughts of self-harm, please call or text 988 immediately.",
    }


@tool
def get_therapist_resources(
    country: str = "US",
    concern: str = "general",
    cost_concern: bool = False,
) -> dict:
    """
    Provide mental health professional resources and how to access therapy.

    Args:
        country: User's country (e.g. 'US', 'UK', 'Uganda', 'India')
        concern: Type of mental health concern
        cost_concern: Whether cost/affordability is a concern
    """
    RESOURCES = {
        "US": {
            "directories": [
                {"name": "Psychology Today", "url": "https://www.psychologytoday.com/us/therapists", "note": "Filter by insurance, specialty, and cost"},
                {"name": "Open Path Collective", "url": "https://openpathcollective.org", "note": "Sessions from $30-$80 for those with financial need"},
                {"name": "SAMHSA National Helpline", "url": "https://www.samhsa.gov/find-help/national-helpline", "note": "Free, confidential, 24/7 — 1-800-662-4357"},
            ],
            "low_cost": [
                "Federally Qualified Health Centers (FQHCs) — sliding scale fees",
                "Community Mental Health Centers",
                "University training clinics (supervised graduate students)",
                "Open Path Collective ($30-$80/session)",
            ],
            "crisis": ["988 Suicide & Crisis Lifeline — call or text 988", "Crisis Text Line — text HOME to 741741"],
        },
        "UK": {
            "directories": [
                {"name": "NHS Talking Therapies (IAPT)", "url": "https://www.nhs.uk/mental-health/talking-therapies-medicine-treatments/talking-therapies-and-counselling/nhs-talking-therapies/", "note": "Free NHS mental health service — self-refer"},
                {"name": "British Association for Counselling", "url": "https://www.bacp.co.uk/search/Therapists", "note": "Find accredited therapists"},
            ],
            "low_cost": ["NHS Talking Therapies (free)", "MIND charity support", "Samaritans (free listening)"],
            "crisis": ["Samaritans — call 116 123 (free, 24/7)", "Crisis text — text SHOUT to 85258"],
        },
        "Uganda": {
            "directories": [
                {"name": "Butabika National Referral Hospital", "url": "https://www.butabika.go.ug", "note": "National psychiatric hospital in Kampala"},
                {"name": "Mental Health Uganda", "url": "https://mentalhealthuganda.org", "note": "Community mental health support"},
                {"name": "TPO Uganda", "url": "https://www.tpoug.org", "note": "Transcultural Psychosocial Organisation"},
            ],
            "low_cost": ["Community health workers through Ministry of Health", "Religious counselling centres", "Mental Health Uganda peer support"],
            "crisis": ["Call 0800 21 21 21 (Uganda mental health helpline)", "Nearest government hospital emergency department"],
        },
        "global": {
            "directories": [
                {"name": "IASP Crisis Centres", "url": "https://www.iasp.info/resources/Crisis_Centres/", "note": "International directory of crisis centres"},
                {"name": "7 Cups", "url": "https://www.7cups.com", "note": "Free online emotional support in many languages"},
            ],
            "crisis": ["988 (US)", "116 123 (UK)", "IASP directory for other countries"],
        },
    }

    country_upper = country.upper()
    resources = RESOURCES.get(country_upper, RESOURCES["global"])

    return {
        "country": country,
        "concern": concern,
        "resources": resources,
        "online_therapy": [
            {"name": "BetterHelp", "url": "https://www.betterhelp.com", "note": "Subscription-based, available globally"},
            {"name": "Talkspace", "url": "https://www.talkspace.com", "note": "Message and video therapy"},
            {"name": "7 Cups", "url": "https://www.7cups.com", "note": "Free peer support and paid therapy"},
        ],
        "important": "These are starting points. A good therapeutic relationship matters more than the platform. Don't give up if the first therapist isn't the right fit.",
    }


MENTAL_HEALTH_TOOLS = [
    score_mental_assessment,
    assess_crisis_risk,
    get_coping_strategies,
    get_therapist_resources,
]
