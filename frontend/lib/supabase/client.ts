import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Gets token via server-side route — works with HttpOnly cookie OAuth sessions
export async function getAccessToken(): Promise<string> {
  try {
    const res = await fetch('/api/token');
    if (!res.ok) return '';
    const { token } = await res.json();
    return token || '';
  } catch {
    return '';
  }
}
