import type { AppState, StateAction } from '../types';

export async function fetchState(): Promise<{ state: AppState; online: number | null }> {
  const res = await fetch('/api/state');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || 'Không tải được dữ liệu');
  }
  return res.json();
}

export async function postAction(
  action: StateAction,
  token: string | null,
): Promise<{ ok: boolean; state?: AppState; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch('/api/action', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: (data as { error?: string }).error || 'Thao tác thất bại',
    };
  }
  return data as { ok: boolean; state?: AppState; error?: string };
}
