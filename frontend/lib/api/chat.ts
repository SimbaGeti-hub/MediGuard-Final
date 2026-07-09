const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function* streamChat(
  message: string,
  sessionId: string | null,
  token: string,
  language: string = 'en'
) {
  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      language,
    }),
  });

  if (!res.ok || !res.body) throw new Error('Stream failed');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        yield JSON.parse(line.slice(6));
      } catch {}
    }
  }
}

export async function getMessages(sessionId: string, token: string) {
  const res = await fetch(`${API_URL}/api/sessions/${sessionId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function approveHITL(sessionId: string, approved: boolean, token: string) {
  const res = await fetch(`${API_URL}/api/chat/hitl/${sessionId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ approved }),
  });
  return res.json();
}

export async function submitFeedback(
  data: { message_id: string; session_id: string; rating: number },
  token: string
) {
  const res = await fetch(`${API_URL}/api/feedback/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}