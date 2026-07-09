BASE_SYSTEM_PROMPT = """You are MediGuard AI, an intelligent healthcare navigation assistant.

You help users understand symptoms, manage medications, find appropriate care,
and make informed health decisions. You are NOT a replacement for professional
medical care — you are a knowledgeable guide that helps people navigate the
healthcare system safely and confidently.

## Core Principles
1. SAFETY FIRST: If any message suggests a medical emergency, immediately direct
   the user to call emergency services. Never delay this.
2. ACCURACY: Only provide information grounded in established medical knowledge.
3. EMPATHY: People asking health questions are often scared or in pain. Be kind.
4. CLARITY: Use plain language. Avoid jargon unless the user is clearly a professional.
5. BOUNDARIES: You provide information and guidance, not diagnoses or prescriptions.

## Language
{language_instruction}

## User Health Profile
{profile_context}

## Current Medications (Full Detail)
{medications_context}

## Medication Adherence (Last 7 Days)
{adherence_context}

## Mental Health & Mood
{mental_health_context}

## Recent Symptom Patterns
{symptom_context}

## Relevant Past Interactions
{memory_context}

## Available Tools
- assess_symptoms: Analyze symptoms and determine urgency level
- check_drug_interactions: Check for dangerous drug interactions
- retrieve_medical_knowledge: Search the medical knowledge base
- find_care_level: Determine appropriate care setting
- update_health_profile: Save new health information the user shares

## Tool Settings
{tool_settings}

## Response Format
Always end with:
- A clear recommendation (what to do next)
- When to seek immediate care (if relevant)
- A disclaimer that this is informational, not medical advice
"""

PERSONALITY_CLINICAL = """
## Communication Style: Clinical
- Use precise medical terminology
- Be direct and information-dense
- Structure responses with clear sections
"""

PERSONALITY_FRIENDLY = """
## Communication Style: Friendly & Warm
- Use conversational, plain language
- Acknowledge emotions and show empathy
- Use analogies to explain medical concepts
"""

PERSONALITY_CONCISE = """
## Communication Style: Concise
- Keep responses brief and to the point
- Use bullet points where helpful
- Avoid lengthy explanations unless asked
"""

LANGUAGE_NAMES = {
    "en": "English", "es": "Spanish", "zh": "Chinese", "hi": "Hindi",
    "ar": "Arabic", "bn": "Bengali", "pt": "Portuguese", "ru": "Russian",
    "ja": "Japanese", "id": "Indonesian", "de": "German", "fr": "French",
    "ko": "Korean", "vi": "Vietnamese", "it": "Italian", "tr": "Turkish",
    "sw": "Swahili", "ha": "Hausa", "am": "Amharic", "yo": "Yoruba",
    "fa": "Persian", "pl": "Polish", "uk": "Ukrainian", "tl": "Filipino",
    "th": "Thai", "nl": "Dutch", "pa": "Punjabi", "ur": "Urdu",
    "te": "Telugu", "ta": "Tamil",
}

EMERGENCY_CLASSIFIER_PROMPT = """You are an emergency medical classifier. Analyze the user message and determine if it describes a medical emergency requiring immediate intervention.

EMERGENCY indicators:
- Chest pain, pressure, or tightness
- Difficulty breathing or shortness of breath
- Signs of stroke: sudden numbness, confusion, trouble speaking, severe headache
- Severe allergic reaction: throat swelling, can't breathe
- Uncontrolled bleeding
- Loss of consciousness or altered mental status
- Severe trauma
- Suicidal thoughts with immediate plan
- Overdose symptoms

User message: {message}

Respond with ONLY valid JSON:
{{
  "is_emergency": true/false,
  "confidence": 0.0-1.0,
  "emergency_type": "cardiac" | "stroke" | "respiratory" | "trauma" | "allergic" | "other" | null,
  "reasoning": "one sentence explanation"
}}"""

SESSION_TITLE_PROMPT = """Based on this first user message, generate a short (3-6 words)
descriptive title for this health conversation.
Return ONLY the title, nothing else.

User message: {message}"""


def build_medications_context(medications: list, adherence: dict) -> tuple:
    """Build rich medication and adherence context strings."""
    if not medications:
        med_context = "No active medications on record."
    else:
        lines = []
        for m in medications:
            line = f"- {m.get('name', 'Unknown')}"
            if m.get('dosage'):
                line += f" {m['dosage']}{m.get('unit', 'mg')}"
            if m.get('frequency'):
                line += f", {m['frequency']}"
            if m.get('prescribing_doctor'):
                line += f" (prescribed by {m['prescribing_doctor']})"
            if m.get('notes'):
                line += f" — Note: {m['notes']}"
            lines.append(line)
        med_context = "\n".join(lines)

    if not adherence or adherence.get('total', 0) == 0:
        adh_context = "No dose history recorded yet."
    else:
        rate = adherence.get('rate', 0)
        taken = adherence.get('taken', 0)
        skipped = adherence.get('skipped', 0)
        total = adherence.get('total', 0)
        status = "excellent" if rate >= 90 else "good" if rate >= 75 else "poor — patient may need adherence support"
        adh_context = (
            f"Adherence rate: {rate}% ({taken} taken, {skipped} missed out of {total} doses) — {status}"
        )

    return med_context, adh_context


def build_mental_health_context(mood_entries: list, assessments: list, journal_entries: list) -> str:
    """Build mental health context string."""
    parts = []

    if mood_entries:
        recent = mood_entries[:7]
        avg_mood = sum(e.get('mood_score', 5) for e in recent) / len(recent)
        avg_energy = sum(e.get('energy_level', 5) for e in recent) / len(recent)
        avg_anxiety = sum(e.get('anxiety_level', 5) for e in recent) / len(recent)
        latest = mood_entries[0]
        parts.append(
            f"Mood tracking (last {len(recent)} entries): "
            f"avg mood {avg_mood:.1f}/10, avg energy {avg_energy:.1f}/10, avg anxiety {avg_anxiety:.1f}/10. "
            f"Latest ({latest.get('date', 'today')}): mood {latest.get('mood_score')}/10, "
            f"energy {latest.get('energy_level')}/10, anxiety {latest.get('anxiety_level')}/10."
        )
        if latest.get('notes'):
            parts.append(f"Latest mood note: \"{latest['notes'][:150]}\"")

    if assessments:
        latest_phq = next((a for a in assessments if a.get('assessment_type') == 'PHQ-9'), None)
        latest_gad = next((a for a in assessments if a.get('assessment_type') == 'GAD-7'), None)
        if latest_phq:
            parts.append(
                f"PHQ-9 depression screen: {latest_phq.get('total_score', 0)}/27 "
                f"({latest_phq.get('severity', 'unknown')}) — taken {str(latest_phq.get('created_at', ''))[:10]}"
            )
        if latest_gad:
            parts.append(
                f"GAD-7 anxiety screen: {latest_gad.get('total_score', 0)}/21 "
                f"({latest_gad.get('severity', 'unknown')}) — taken {str(latest_gad.get('created_at', ''))[:10]}"
            )

    if journal_entries:
        parts.append(f"Journal: {len(journal_entries)} recent entries on record.")
        latest_j = journal_entries[0]
        if latest_j.get('content'):
            snippet = latest_j['content'][:200].replace('\n', ' ')
            parts.append(f"Latest journal entry: \"{snippet}...\"")

    return "\n".join(parts) if parts else "No mental health data recorded yet."


def build_symptom_context(symptom_logs: list) -> str:
    """Build symptom pattern context."""
    if not symptom_logs:
        return "No symptoms logged recently."

    symptom_counts: dict = {}
    for s in symptom_logs:
        name = s.get('symptom', 'unknown')
        symptom_counts[name] = symptom_counts.get(name, 0) + 1

    lines = []
    seen: set = set()
    for s in symptom_logs[:20]:
        name = s.get('symptom', 'unknown')
        if name in seen:
            continue
        seen.add(name)
        count = symptom_counts[name]
        line = f"- {name}: severity {s.get('severity', '?')}/10"
        if count > 1:
            line += f" (logged {count}x in last 30 days)"
        if s.get('time_of_day'):
            line += f", often {s['time_of_day']}"
        lines.append(line)
        if len(lines) >= 7:
            break

    return "\n".join(lines)


def build_system_prompt(
    profile: dict,
    memories: list,
    settings: dict,
    tool_toggles: dict,
    medications: list = None,
    adherence: dict = None,
    mood_entries: list = None,
    assessments: list = None,
    journal_entries: list = None,
    symptom_logs: list = None,
) -> str:
    # Profile
    if profile:
        profile_context = (
            f"- Name: {profile.get('full_name', 'Not provided')}\n"
            f"- Age: {profile.get('age', 'Not provided')}\n"
            f"- Conditions: {', '.join(profile.get('conditions', [])) or 'None on record'}\n"
            f"- Allergies: {', '.join(profile.get('allergies', [])) or 'None on record'}\n"
            f"- Blood Type: {profile.get('blood_type', 'Unknown')}"
        )
    else:
        profile_context = "No health profile set up yet."

    # Medications & adherence
    med_context, adh_context = build_medications_context(
        medications or [], adherence or {}
    )

    # Mental health
    mental_context = build_mental_health_context(
        mood_entries or [], assessments or [], journal_entries or []
    )

    # Symptoms
    symptom_context = build_symptom_context(symptom_logs or [])

    # Memories
    if memories:
        memory_context = "\n".join(
            [f"- [{m.get('memory_type', 'general')}] {m.get('content', '')}" for m in memories[:5]]
        )
    else:
        memory_context = "No previous health interactions on record."

    # Tools
    enabled = [k for k, v in tool_toggles.items() if v]
    tool_settings = f"Enabled tools: {', '.join(enabled) if enabled else 'All tools disabled'}"

    # Personality
    personality = settings.get("personality", "friendly")
    personality_prompt = {
        "clinical": PERSONALITY_CLINICAL,
        "friendly": PERSONALITY_FRIENDLY,
        "concise": PERSONALITY_CONCISE,
    }.get(personality, PERSONALITY_FRIENDLY)

    # Language
    lang_code = settings.get("language", "en")
    lang_name = LANGUAGE_NAMES.get(lang_code, "English")
    if lang_code == "en":
        language_instruction = "Respond in English."
    else:
        language_instruction = (
            f"You MUST respond entirely in {lang_name}. "
            f"Translate all responses including medical terms, recommendations, and disclaimers. "
            f"Do not respond in English unless the user explicitly asks."
        )

    return (
        BASE_SYSTEM_PROMPT.format(
            profile_context=profile_context,
            medications_context=med_context,
            adherence_context=adh_context,
            mental_health_context=mental_context,
            symptom_context=symptom_context,
            memory_context=memory_context,
            tool_settings=tool_settings,
            language_instruction=language_instruction,
        )
        + personality_prompt
    )