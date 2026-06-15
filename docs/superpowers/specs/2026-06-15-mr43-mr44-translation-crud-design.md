# MR43 & MR44: Translation Edit & Delete — Design Spec

## API Routes

All routes are nested under mangas with full ownership validation:

| Method | Path | Purpose | Status Code |
|--------|------|---------|-------------|
| `PATCH` | `/mangas/:mangaId/chapter/:chapterId/translations/:translationId` | Update language, translator, folderPath | `200` |
| `DELETE` | `/mangas/:mangaId/chapter/:chapterId/translations/:translationId` | Delete a translation | `204` |

Every request validates `mangaId` and `chapterId` exist — returns `404` if not found. The translation must also belong to the given chapter/manga (returns `404` on mismatch).

## Backend

### DTO

`backend/src/modules/manga/dto/translation.dto.ts`:

```typescript
import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateTranslationDto {
  @IsOptional()
  @IsNumber()
  languageId?: number

  @IsOptional()
  @IsNumber()
  translatorId?: number

  @IsOptional()
  @IsString()
  @MinLength(1)
  folderPath?: string
}
```

All fields optional — only provided fields are updated.

### Repository

Add to `backend/src/modules/manga/translation.repository.ts`:

- `findById(id: number): Promise<Translation | null>` — fetches with `chapter` + `chapter.manga` relations for ownership chain validation
- `update(id: number, data: Partial<Translation>): Promise<Translation>` — calls `repo.update()` then returns updated entity via `repo.findOne()`
- `delete(id: number): Promise<void>` — calls `repo.delete(id)`

### Service

Create `backend/src/modules/manga/services/translation.service.ts`:

Dependencies: `TranslationRepository`, `LanguageService`, `TranslatorService`.

**`update(mangaId: number, chapterId: number, translationId: number, dto: UpdateTranslationDto)`:**

1. Fetch translation by `translationId` with chapter+manga relations
   → `404` if not found
2. Verify `translation.chapter.id === chapterId`
   → `404` mismatch
3. Verify `translation.chapter.manga.id === mangaId`
   → `404` mismatch
4. If `dto.languageId` changed: verify language exists via `LanguageService.findOne()`
   → `404` if not found
5. If `dto.translatorId` changed: verify translator exists via `TranslatorService.findOne()`
   → `404` if not found
6. If language OR translator changed: check `TranslationRepository.findByChapterAndLanguageAndTranslator()` for existing combo
   → `409 Conflict` if duplicate exists (same chapter + language + translator)
7. Build partial entity with only changed fields, call `TranslationRepository.update()`
8. Return updated translation

**`delete(mangaId: number, chapterId: number, translationId: number)`:**

1. Fetch translation (same ownership validation as update)
   → `404` if not found or ownership mismatch
2. Call `TranslationRepository.delete(id)`

Both methods are arrow functions (`= async (...) =>`) matching the existing service convention.

### Controller

Add to `backend/src/modules/manga/manga.controller.ts`:

```typescript
@Patch(':mangaId/chapter/:chapterId/translations/:translationId')
updateTranslation(
  @Param('mangaId', ParseIntPipe) mangaId: number,
  @Param('chapterId', ParseIntPipe) chapterId: number,
  @Param('translationId', ParseIntPipe) translationId: number,
  @Body() dto: UpdateTranslationDto,
) {
  return this.translationService.update(mangaId, chapterId, translationId, dto)
}

@Delete(':mangaId/chapter/:chapterId/translations/:translationId')
@HttpCode(HttpStatus.NO_CONTENT)
deleteTranslation(
  @Param('mangaId', ParseIntPipe) mangaId: number,
  @Param('chapterId', ParseIntPipe) chapterId: number,
  @Param('translationId', ParseIntPipe) translationId: number,
) {
  return this.translationService.delete(mangaId, chapterId, translationId)
}
```

### Module

Register `TranslationService` in `MangaModule` providers and inject into `MangaController` constructor.

## Frontend

### API Service

Add to `frontend/src/services/api/chapterApi.ts`:

```typescript
export interface UpdateTranslationPayload {
  languageId?: number
  translatorId?: number
  folderPath?: string
}

export async function updateTranslation(
  mangaId: number,
  chapterId: number,
  translationId: number,
  payload: UpdateTranslationPayload,
): Promise<void> {
  await axiosInstance.patch(
    `/mangas/${mangaId}/chapter/${chapterId}/translations/${translationId}`,
    payload,
  )
}

export async function deleteTranslation(
  mangaId: number,
  chapterId: number,
  translationId: number,
): Promise<void> {
  await axiosInstance.delete(
    `/mangas/${mangaId}/chapter/${chapterId}/translations/${translationId}`,
  )
}
```

### Hooks

Create `frontend/src/hooks/useTranslations.ts`:

```typescript
export function useUpdateTranslation(mangaId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ chapterId, translationId, data }: { chapterId: number; translationId: number; data: UpdateTranslationPayload }) =>
      updateTranslation(mangaId, chapterId, translationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas', 'detail', mangaId] })
      toast.success('Translation updated')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to update translation')
    },
  })
}

export function useDeleteTranslation(mangaId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ chapterId, translationId }: { chapterId: number; translationId: number }) =>
      deleteTranslation(mangaId, chapterId, translationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mangas', 'detail', mangaId] })
      toast.success('Translation deleted')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to delete translation')
    },
  })
}
```

Follows the exact pattern from `useAuthors.ts` / `useChapters.ts`.

## Implementation Order

### MR43 (Edit)
1. Add `findById` + `update` to `TranslationRepository`
2. Create `UpdateTranslationDto` in `translation.dto.ts`
3. Create `TranslationService.update()`
4. Add controller route to `MangaController`
5. Register service in module
6. Frontend: `updateTranslation()` API + `useUpdateTranslation` hook
7. Verify: build + tests pass

### MR44 (Delete)
1. Add `delete` to `TranslationRepository`
2. Add `TranslationService.delete()`
3. Add controller route to `MangaController`
4. Frontend: `deleteTranslation()` API + `useDeleteTranslation` hook
5. Verify: build + tests pass

## Acceptance Criteria

- [ ] `PATCH /mangas/:mangaId/chapter/:chapterId/translations/:translationId` updates provided fields only
- [ ] `DELETE /mangas/:mangaId/chapter/:chapterId/translations/:translationId` returns 204
- [ ] 404 on invalid mangaId / chapterId / translationId
- [ ] 409 on duplicate language+translator for the same chapter
- [ ] Ownership chain validated (translation belongs to chapter, chapter belongs to manga)
- [ ] Frontend API functions + hooks exist and invalidate cache
- [ ] All 243+ backend tests pass
