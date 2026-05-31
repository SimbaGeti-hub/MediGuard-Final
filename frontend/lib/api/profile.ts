const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchProfile(token: string) {
  const res = await fetch(`${API_URL}/api/profile/`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

export async function updateProfile(data: Record<string, unknown>, token: string) {
  const res = await fetch(`${API_URL}/api/profile/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchSettings(token: string) {
  const res = await fetch(`${API_URL}/api/settings/`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

export async function updateSettings(data: Record<string, unknown>, token: string) {
  const res = await fetch(`${API_URL}/api/settings/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  return res.json();
}
