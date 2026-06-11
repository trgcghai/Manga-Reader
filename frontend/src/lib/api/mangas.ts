export interface MangaResponse {
  id: number;
  title: string;
  alternativeTitles: string[];
  description: string;
  coverPath: string;
  status: string;
  authors?: { id: number; name: string }[];
  genres?: { id: number; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface CreateMangaPayload {
  title: string;
  status: string;
  description?: string;
  alternativeTitles?: string[];
  coverPath?: string;
  authors?: string[];
  genres?: string[];
}

export async function fetchMangas(
  page: number,
  limit: number,
): Promise<PaginatedResponse<MangaResponse>> {
  const res = await fetch(`/api/mangas?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch mangas');
  return res.json();
}

export async function createManga(
  data: CreateMangaPayload,
): Promise<MangaResponse> {
  const res = await fetch('/api/mangas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to create manga');
  }
  return res.json();
}
