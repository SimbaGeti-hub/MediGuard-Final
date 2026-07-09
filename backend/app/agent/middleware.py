import re
from app.db.supabase import get_supabase_client

PII_PATTERNS = [
    (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN REDACTED]'),
    (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL REDACTED]'),
    (r'\b\d{10,16}\b', '[NUMBER REDACTED]'),
]


def validate_input(user_message: str) -> tuple[bool, str]:
    """Hook 1: before_agent — validate and sanitise input."""
    if not user_message or not user_message.strip():
        return False, "Empty message"
    if len(user_message) > 5000:
        return False, "Message too long (max 5000 characters)"
    dangerous = ["ignore previous", "system prompt", "jailbreak", "ignore all instructions"]
    msg_lower = user_message.lower()
    for pattern in dangerous:
        if pattern in msg_lower:
            return False, "Invalid input detected"
    return True, ""


def trim_messages(messages: list, max_messages: int = 20) -> list:
    """Hook 2: before_model — trim old messages to prevent context overflow."""
    if len(messages) <= max_messages:
        return messages
    system_msgs = [m for m in messages if hasattr(m, "type") and m.type == "system"]
    recent_msgs = messages[-max_messages:]
    return system_msgs + recent_msgs


def check_token_budget(tokens_used: int, max_tokens: int = 50000) -> bool:
    """Hook 3: wrap_model_call — prevent runaway token usage."""
    return tokens_used < max_tokens


def redact_response_pii(response_text: str) -> str:
    """Hook 5: after_model — remove any PII that leaked into response."""
    for pattern, replacement in PII_PATTERNS:
        response_text = re.sub(pattern, replacement, response_text)
    return response_text


async def log_audit(
    user_id: str,
    session_id: str,
    action: str,
    tool_called: str = None,
    risk_level: str = "low",
    outcome: str = None,
) -> None:
    """Hook 6: after_agent — audit trail for every agent action."""
    try:
        client = get_supabase_client()
        client.table("audit_log").insert({
            "user_id": user_id,
            "session_id": session_id,
            "action": action,
            "tool_called": tool_called,
            "risk_level": risk_level,
            "outcome": outcome,
        }).execute()
    except Exception:
        pass
