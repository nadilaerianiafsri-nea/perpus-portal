import { cookies } from 'next/headers';

export type CurrentUser = {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'PENGUNJUNG';
  memberType?: 'UMUM' | 'MAHASISWA' | 'PEGAWAI' | null;
};

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3001';

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('perpus_session')?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: `perpus_session=${encodeURIComponent(token)}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CurrentUser;
  } catch {
    return null;
  }
}
