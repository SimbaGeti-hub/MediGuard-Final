import json
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.agent.prompts import EMERGENCY_CLASSIFIER_PROMPT
from app.config import get_settings

settings = get_settings()


async def classify_emergency(user_message: str) -> dict:
    """
    Run the emergency classification sub-agent (MAS pattern).
    Uses gpt-4o-mini — fast, cheap, deterministic.
    """
    if not settings.OPENAI_API_KEY:
        return {"is_emergency": False, "confidence": 0.0, "emergency_type": None, "reasoning": "No API key"}

    try:
        classifier_llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0,
            max_tokens=200,
            api_key=settings.OPENAI_API_KEY,
        )
        response = await classifier_llm.ainvoke([
            SystemMessage(content=EMERGENCY_CLASSIFIER_PROMPT),
            HumanMessage(content=user_message),
        ])
        content = response.content.strip()
        # Strip markdown fences if present
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        result = json.loads(content.strip())
        return {
            "is_emergency": result.get("is_emergency", False),
            "confidence": result.get("confidence", 0.0),
            "emergency_type": result.get("emergency_type"),
            "reasoning": result.get("reasoning", ""),
        }
    except Exception as e:
        return {
            "is_emergency": False,
            "confidence": 0.0,
            "emergency_type": None,
            "reasoning": f"Classifier error: {str(e)}",
            "error": True,
        }
