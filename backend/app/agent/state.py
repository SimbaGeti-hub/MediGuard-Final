from typing import Annotated, Any
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    # Core conversation memory
    messages: Annotated[list, add_messages]

    # User context
    user_id: str
    session_id: str
    user_profile: dict
    user_settings: dict
    long_term_memories: list

    # Phase 1 — Full integrated health context
    medications: list        # full medication records with dosage/schedule
    adherence: dict          # 7-day adherence rate and stats
    mood_entries: list       # recent mood tracking entries
    assessments: list        # PHQ-9 / GAD-7 results
    journal_entries: list    # recent journal entries
    symptom_logs: list       # recent symptom logs with severity/pattern

    # Agent working state
    current_concern: str
    retrieved_context: list
    tool_results: dict
    tools_called: list
    react_steps: list

    # Risk & safety
    risk_level: str
    emergency_detected: bool
    hitl_required: bool
    hitl_reason: str
    hitl_approved: bool

    # Metrics
    tokens_used: int
    cost_usd: float
    model_used: str

    # Control
    iteration_count: int
    max_iterations: int
    should_stop: bool
    error_message: str