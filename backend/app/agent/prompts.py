BASE_SYSTEM_PROMPT = """You are MediGuard AI, an intelligent healthcare navigation assistant.

You help users understand symptoms, manage medications, find appropriate care,
and make informed health decisions. You are NOT a replacement for professional
medical care — you are a knowledgeable guide that helps people navigate the
healthcare system safely and confidently.

## Core Principles
1. SAFETY FIRST: If any message suggests a medical emergency, immediately direct
   the user to call 911 or go to the ER. Never delay this.
2. ACCURACY: Only provide information grounded in established medical knowledge.
3. EMPATHY: People asking health questions are often scared or in pain. Be kind.
4. CLARITY: Use plain language. Avoid jargon unless the user is clearly a professional.
5. BOUNDARIES: You provide information and guidance, not diagnoses or prescriptions.

## Language
{language_instruction}

## User Health Profile
{profile_context}

## Relevant Past Interactions (Long-Term Memory)
{memory_context}

## Available Tools
- assess_symptoms: Analyze symptoms and determine urgency level
- check_drug_interactions: Check for dangerous drug interactions via OpenFDA
- retrieve_medical_knowledge: Search the medical knowledge base (Agentic RAG)
- find_care_level: Determine appropriate care setting (home, urgent care, ER, 911)
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

# Maps language codes to human-readable names for the prompt
LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish (Español)",
    "zh": "Chinese (中文)",
    "hi": "Hindi (हिन्दी)",
    "ar": "Arabic (العربية)",
    "bn": "Bengali (বাংলা)",
    "pt": "Portuguese (Português)",
    "ru": "Russian (Русский)",
    "ja": "Japanese (日本語)",
    "pa": "Punjabi (ਪੰਜਾਬੀ)",
    "mr": "Marathi (मराठी)",
    "te": "Telugu (తెలుగు)",
    "ta": "Tamil (தமிழ்)",
    "ur": "Urdu (اردو)",
    "id": "Indonesian (Bahasa Indonesia)",
    "de": "German (Deutsch)",
    "fr": "French (Français)",
    "ko": "Korean (한국어)",
    "vi": "Vietnamese (Tiếng Việt)",
    "it": "Italian (Italiano)",
    "tr": "Turkish (Türkçe)",
    "sw": "Swahili (Kiswahili)",
    "ha": "Hausa",
    "am": "Amharic (አማርኛ)",
    "yo": "Yoruba (Yorùbá)",
    "fa": "Persian (فارسی)",
    "pl": "Polish (Polski)",
    "uk": "Ukrainian (Українська)",
    "tl": "Filipino (Filipino)",
    "th": "Thai (ภาษาไทย)",
    "nl": "Dutch (Nederlands)",
}

EMERGENCY_CLASSIFIER_PROMPT = """You are an emergency medical classifier. Analyze the user message and determine if it describes a medical emergency requiring immediate intervention (911/ER).

EMERGENCY indicators:
- Chest pain, pressure, or tightness
- Difficulty breathing or shortness of breath  
- Signs of stroke: sudden numbness, confusion, trouble speaking, severe headache
- Severe allergic reaction (anaphylaxis): throat swelling, can't breathe
- Uncontrolled bleeding
- Loss of consciousness or altered mental status
- Severe trauma (car accident, fall, violence)
- Suicidal thoughts with immediate plan
- Overdose symptoms

NON-EMERGENCY (normal health questions):
- Asking about medications or dosages
- Describing mild/moderate symptoms for advice
- General health questions
- Mental health support without immediate crisis
- Medication reminders

User message: {message}

Examples:
- "I'm having chest pain and can't breathe" → is_emergency: true, confidence: 0.95
- "What's the dosage for ibuprofen?" → is_emergency: false, confidence: 0.02
- "I've been having headaches for a week" → is_emergency: false, confidence: 0.05
- "I think I'm having a stroke, my face is drooping" → is_emergency: true, confidence: 0.98
- "feeling a bit dizzy today" → is_emergency: false, confidence: 0.03

Respond with ONLY valid JSON, no other text:
{
  "is_emergency": true/false,
  "confidence": 0.0-1.0,
  "emergency_type": "cardiac" | "stroke" | "respiratory" | "trauma" | "allergic" | "other" | null,
  "reasoning": "one sentence explanation"
}"""

SESSION_TITLE_PROMPT = """Based on this first user message, generate a short (3-6 words) 
descriptive title for this health conversation. 
Return ONLY the title, nothing else.

User message: {message}"""


def build_system_prompt(
    profile: dict,
    memories: list,
    settings: dict,
    tool_toggles: dict,
) -> str:
    if profile:
        profile_context = f"""
- Name: {profile.get('full_name', 'Not provided')}
- Age: {profile.get('age', 'Not provided')}
- Conditions: {', '.join(profile.get('conditions', [])) or 'None on record'}
- Medications: {', '.join(profile.get('medications', [])) or 'None on record'}
- Allergies: {', '.join(profile.get('allergies', [])) or 'None on record'}
- Blood Type: {profile.get('blood_type', 'Unknown')}"""
    else:
        profile_context = "No health profile set up yet."

    if memories:
        memory_context = "\n".join(
            [f"- [{m['memory_type']}] {m['content']}" for m in memories[:5]]
        )
    else:
        memory_context = "No previous health interactions on record."

    enabled = [k for k, v in tool_toggles.items() if v]
    tool_settings = f"Enabled tools: {', '.join(enabled) if enabled else 'All tools disabled'}"

    personality = settings.get("personality", "friendly")
    personality_prompt = {
        "clinical": PERSONALITY_CLINICAL,
        "friendly": PERSONALITY_FRIENDLY,
        "concise": PERSONALITY_CONCISE,
    }.get(personality, PERSONALITY_FRIENDLY)

    # ✅ Language instruction — tell the AI which language to respond in
    lang_code = settings.get("language", "en")
    lang_name = LANGUAGE_NAMES.get(lang_code, "English")
    if lang_code == "en":
        language_instruction = "Respond in English."
    else:
        language_instruction = (
            f"You MUST respond in {lang_name}. "
            f"Translate all your responses into {lang_name}, including medical terms, "
            f"recommendations, and disclaimers. Do not respond in English unless the user explicitly asks."
        )

    return (
        BASE_SYSTEM_PROMPT.format(
            profile_context=profile_context,
            memory_context=memory_context,
            tool_settings=tool_settings,
            language_instruction=language_instruction,
        )
        + personality_prompt
    )