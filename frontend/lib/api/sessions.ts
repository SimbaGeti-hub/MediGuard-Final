const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchSessions(token: string) {
  const res = await fetch(`${API_URL}/api/sessions/`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

export async function createSession(token: string) {
  const res = await fetch(`${API_URL}/api/sessions/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function deleteSession(sessionId: string, token: string) {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
