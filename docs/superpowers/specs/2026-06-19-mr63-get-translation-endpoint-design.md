# MR63: GET /mangas/translations/:translationId Endpoint

## Summary

Add a lightweight endpoint returning a single translation with its chapter and manga context, needed by the reader page (`/reader/$translationId`). Currently translations are only available nested inside the manga detail response.

## Architecture

```
Reader page (/reader/:translationId)
    │
    GET /mangas/translations/:translationId
    │
    ▼
MangaController.getTranslation(translationId)
    │
    ▼
TranslationService.findOne(translationId)
    │
    ├─ translationRepo.findById(id) → loads ['chapter', 'chapter.manga'] + eager language/translator
    ├─ throws NotFoundException if null
    └─ maps entity → TranslationDetailResponse DTO
```

## Files

### Modified: `backend/src/modules/manga/dto/translation.dto.ts`

Add `TranslationDetailResponse` class with nested chapter/manga structure:

```typescript
export class TranslationDetailResponse {
  id: number;
  url: string;
  note?: string;
  createdAt: string;
  language: { id: number; code: string; name: string };
  translator: { id: number; name: string };
  chapter: {
    id: number;
    number: number;
    title?: string;
    manga: { id: number; title: string };
  };
}
```

### Modified: `backend/src/modules/manga/services/translation.service.ts`

Add `findOne(translationId: number)` method:

1. Call `this.translationRepo.findById(translationId)`
2. Throw `NotFoundException('Translation not found')` if null
3. Map entity to `TranslationDetailResponse` and return

### Modified: `backend/src/modules/manga/manga.controller.ts`

Add `@Get('translations/:translationId')` endpoint:

- `@Param('translationId', ParseIntPipe) translationId: number`
- Calls `this.translationService.findOne(translationId)`
- Returns the DTO directly

### Modified: `backend/src/modules/manga/services/translation.service.spec.ts`

Add `describe('findOne', ...)` block:

- Found: returns DTO with correct fields
- Not found: throws `NotFoundException`

### Modified: `backend/src/modules/manga/manga.controller.spec.ts`

- Add `findOne: jest.fn()` to `mockTranslationService` in module config
- Add `describe('getTranslation', ...)` block with found + not-found cases

## Data Flow

1. Reader page loads → calls `GET /mangas/translations/:id`
2. Controller receives `translationId` (ParseIntPipe ensures it's a number)
3. Service calls `translationRepo.findById(id)` which loads `['chapter', 'chapter.manga']`
4. If null → 404
5. If found → map to `TranslationDetailResponse`, return

The response shape the frontend reader page receives:

```json
{
  "id": 1,
  "url": "/path/to/chapter.cbz",
  "note": null,
  "createdAt": "2026-06-19T...",
  "language": { "id": 1, "code": "en", "name": "English" },
  "translator": { "id": 1, "name": "Translator A" },
  "chapter": {
    "id": 5,
    "number": 1,
    "title": "Chapter 1",
    "manga": { "id": 10, "title": "One Piece" }
  }
}
```

## Error Handling

| Case | HTTP Status |
|------|------------|
| Translation not found | 404 |
| Invalid `translationId` (non-numeric) | 400 (ParseIntPipe built-in) |
