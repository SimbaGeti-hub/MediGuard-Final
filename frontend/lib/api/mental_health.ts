const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function req(path: string, token: string, method = 'GET', body?: unknown) {
  const res = await fetch(`${API_URL}/api/mental-health${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

// Mood
export const logMood    = (data: Record<string, unknown>, token: string) => req('/mood', token, 'POST', data);
export const getMoods   = (token: string, days = 30) => req(`/mood?days=${days}`, token);
export const getTodayMood = (token: string) => req('/mood/today', token);

// Assessments
export const saveAssessment = (data: Record<string, unknown>, token: string) => req('/assessment', token, 'POST', data);
export const getAssessments = (token: string, type?: string) => req(`/assessment${type ? `?type=${type}` : ''}`, token);

// Journal
export const createJournal = (data: Record<string, unknown>, token: string) => req('/journal', token, 'POST', data);
export const getJournal    = (token: string, limit = 20) => req(`/journal?limit=${limit}`, token);
export const updateJournal = (id: string, data: Record<string, unknown>, token: string) => req(`/journal/${id}`, token, 'PUT', data);
export const deleteJournal = (id: string, token: string) => req(`/journal/${id}`, token, 'DELETE');

// Breathing
export const logBreathing  = (data: Record<string, unknown>, token: string) => req('/breathing', token, 'POST', data);
export const getBreathing  = (token: string) => req('/breathing', token);
