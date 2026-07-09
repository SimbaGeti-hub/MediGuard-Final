from app.db.supabase import get_supabase_client


async def get_relevant_memories(user_id: str, query: str, max_results: int = 5) -> list:
    if not user_id or not query:
        return []
    try:
        client = get_supabase_client()
        query_words = [w.lower() for w in query.split() if len(w) > 3]
        result = (
            client.table("agent_memory")
            .select("*")
            .eq("user_id", user_id)
            .order("importance", desc=True)
            .order("created_at", desc=True)
            .limit(max_results * 3)
            .execute()
        )
        memories = result.data or []

        def score(mem):
            content_lower = mem.get("content", "").lower()
            keywords = mem.get("keywords", [])
            return sum(1 for w in query_words if w in content_lower or w in keywords)

        memories.sort(key=score, reverse=True)
        return memories[:max_results]
    except Exception:
        return []


async def save_memory(
    user_id: str,
    session_id: str,
    memory_type: str,
    content: str,
    keywords: list = [],
    importance: int = 3,
) -> bool:
    if not user_id:
        return False
    try:
        client = get_supabase_client()
        client.table("agent_memory").insert({
            "user_id": user_id,
            "session_id": session_id,
            "memory_type": memory_type,
            "content": content,
            "keywords": keywords,
            "importance": importance,
        }).execute()
        return True
    except Exception:
        return False
