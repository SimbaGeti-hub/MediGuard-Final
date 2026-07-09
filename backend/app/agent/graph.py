from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.agent.state import AgentState
from app.agent.nodes import (
    safety_classifier_node,
    profile_loader_node,
    agent_reasoner_node,
    tool_executor_node,
    hitl_checkpoint_node,
    response_formatter_node,
)
from app.agent.edges import (
    route_after_safety_check,
    route_after_reasoning,
    route_after_tools,
    route_after_hitl,
)


def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("safety_classifier",  safety_classifier_node)
    graph.add_node("profile_loader",     profile_loader_node)
    graph.add_node("agent_reasoner",     agent_reasoner_node)
    graph.add_node("tool_executor",      tool_executor_node)
    graph.add_node("hitl_checkpoint",    hitl_checkpoint_node)
    graph.add_node("response_formatter", response_formatter_node)

    graph.add_edge(START, "safety_classifier")

    graph.add_conditional_edges(
        "safety_classifier",
        route_after_safety_check,
        {"profile_loader": "profile_loader"},
    )

    graph.add_edge("profile_loader", "agent_reasoner")

    graph.add_conditional_edges(
        "agent_reasoner",
        route_after_reasoning,
        {"tool_executor": "tool_executor", "hitl_checkpoint": "hitl_checkpoint"},
    )

    graph.add_conditional_edges(
        "tool_executor",
        route_after_tools,
        {"agent_reasoner": "agent_reasoner"},
    )

    graph.add_conditional_edges(
        "hitl_checkpoint",
        route_after_hitl,
        {"wait_for_approval": END, "response_formatter": "response_formatter"},
    )

    graph.add_edge("response_formatter", END)

    memory = MemorySaver()
    return graph.compile(checkpointer=memory)


_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph
