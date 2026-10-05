export type AuthResult = { ok: boolean; message: string; code?: string; alreadyVerified?: boolean };
export async function authRequest(path: string, body?: Record<string, unknown>): Promise<AuthResult> {
  try {
    const response = await fetch(`/api/auth/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    return { ok: response.ok, message: typeof data.message === 'string' ? data.message : 'Permintaan gagal. Silakan coba lagi.', code: data.code, alreadyVerified: data.alreadyVerified === true };
  } catch { return { ok: false, message: 'Server tidak dapat dihubungi. Silakan coba lagi.' }; }
}
