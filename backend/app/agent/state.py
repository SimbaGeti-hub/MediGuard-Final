from typing import Annotated, Any
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    # Core short-term memory — add_messages appends, never replaces
    messages: Annotated[list, add_messages]

    # User context
    user_id: str
    session_id: str
    user_profile: dict
    user_settings: dict
    long_term_memories: list

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
