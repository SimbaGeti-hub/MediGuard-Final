from pydantic import BaseModel
from typing import Optional


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    is_new_session: bool = False
    language: Optional[str] = None  # BCP-47 language code sent by the frontend (e.g. "en", "fr", "sw")


class HITLApprovalRequest(BaseModel):
    session_id: str
    approved: bool