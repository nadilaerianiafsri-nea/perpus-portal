export type ManagedSubject = { id: number; name: string; createdAt: string; usageCount: number };

type PublicSubjectsResult = { subjects: string[] };
type CreatedSubjectResult = { category: { id: number; name: string } };

async function apiError(response: Response, fallback: string): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'message' in data) {
      const message = (data as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
  } catch {
    // Keep the useful fallback if the response is not JSON.
  }
  return fallback;
}

export function cleanedSubject(input: string): string {
  const value = input.trim().replace(/\s+/g, ' ');
  if (!value || value.length < 2 || value.length > 100 || /[<>\u0000-\u001f\u007f]/.test(input)) {
    throw new Error('Subjek/kategori harus 2–100 karakter dan tidak boleh berisi HTML.');
  }
  return value;
}

export async function loadSubjectCategories(signal?: AbortSignal): Promise<string[]> {
  const response = await fetch('/api/members/public/subjects', { cache: 'no-store', signal });
  if (!response.ok) {
    throw new Error(await apiError(response, 'Daftar subjek/kategori belum dapat dimuat.'));
  }
  const data = (await response.json()) as PublicSubjectsResult;
  if (!Array.isArray(data.subjects) || data.subjects.some((name) => typeof name !== 'string')) {
    throw new Error('Respons daftar subjek/kategori tidak valid.');
  }
  return data.subjects;
}

export async function registerSubjectIfNew(
  input: string,
  knownCategories: readonly string[],
): Promise<string> {
  const name = cleanedSubject(input);
  const existing = knownCategories.find((item) => item.toLocaleLowerCase('id-ID') === name.toLocaleLowerCase('id-ID'));
  if (existing) return existing;

  const response = await fetch('/api/members/admin/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (response.status === 409) {
    // Another admin may have added this category after the form loaded.
    const refreshed = await loadSubjectCategories();
    const found = refreshed.find((item) => item.toLocaleLowerCase('id-ID') === name.toLocaleLowerCase('id-ID'));
    if (found) return found;
  }
  if (!response.ok) {
    throw new Error(await apiError(response, 'Kategori baru gagal disimpan.'));
  }
  const data = (await response.json()) as CreatedSubjectResult;
  if (!data.category || typeof data.category.name !== 'string') {
    throw new Error('Respons penambahan kategori tidak valid.');
  }
  return data.category.name;
}
