# MR107 — Frontend Reading Flag API Client & Hook Design

## Summary

Add the frontend API client function and React Query hook to support updating a manga's reading flag via `PATCH /mangas/:mangaId/flag`.

## Design

### Type Definition

In `mangaApi.ts`, add a type-safe `ReadingFlag` derived from a const array:

```typescript
export const READING_FLAGS = [
  'reading',
  're-reading',
  'planned',
  'completed',
  'paused',
  'dropped',
] as const

export type ReadingFlag = (typeof READING_FLAGS)[number]
```

### MangaResponse update

Add `readingFlag?: ReadingFlag | null` to the existing `MangaResponse` interface.

### API Function

```typescript
export async function updateMangaFlag(
  mangaId: number,
  flag: ReadingFlag | null,
): Promise<MangaResponse> {
  const res = await axiosInstance.patch<MangaResponse>(
    `/mangas/${mangaId}/flag`,
    { flag },
  )
  return res.data
}
```

### React Query Hook

In `useManga.ts`, add:

```typescript
export function useUpdateMangaFlag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ mangaId, flag }: { mangaId: number; flag: ReadingFlag | null }) =>
      updateMangaFlag(mangaId, flag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mangaKeys.all })
      toast.success('Reading flag updated')
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : 'Failed to update reading flag',
      )
    },
  })
}
```

## Files Changed

- `frontend/src/services/api/mangaApi.ts` — add `ReadingFlag` type, `updateMangaFlag` function, update `MangaResponse`
- `frontend/src/hooks/useManga.ts` — add `useUpdateMangaFlag` hook
