import re

PATTERNS = [
    (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN REDACTED]'),
    (r'\b\d{10,16}\b', '[NUMBER REDACTED]'),
    (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL REDACTED]'),
]


def redact_pii(text: str) -> str:
    for pattern, replacement in PATTERNS:
        text = re.sub(pattern, replacement, text)
    return text
