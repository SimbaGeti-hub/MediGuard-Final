from supabase import create_client, Client
from app.config import get_settings

_client: Client = None


def get_supabase_client() -> Client:
    global _client
    if _client is None:
        s = get_settings()
        if not s.SUPABASE_URL or not s.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
        _client = create_client(s.SUPABASE_URL, s.SUPABASE_SERVICE_ROLE_KEY)
    return _client
