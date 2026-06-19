# MR59: Backend — Delete Translation File From Minio When URL Is Updated or Translation Is Deleted

## Motivation

When a translation's CBZ file URL is updated (user uploads a replacement) or when a translation record is deleted, the old CBZ file remains in Minio forever — a resource leak. Both `TranslationService.update` and `TranslationService.delete` must remove the outdated file from Minio, matching the pattern already established in `MangaService` for manga cover images.

## Design

### Changes to `TranslationService`

**File:** `backend/src/modules/manga/services/translation.service.ts`

**New imports:**
```typescript
import { FileService } from 'src/modules/file/file.service';
import { extractKeyFromUrl } from 'src/common/utils/file-mime.util';
```

**Constructor injection (added to existing parameters):**
```typescript
private readonly fileService: FileService,
```

#### `update()` method

After the uniqueness check and before `translationRepo.update()`, delete the old file when the URL is changing:

```typescript
// Inside update(), after uniqueness check, before repo.update()
if (dto.url !== undefined && translation.url) {
  const key = extractKeyFromUrl(
    translation.url,
    this.fileService.endpoint,
    this.fileService.bucket,
  );
  if (key) {
    await this.fileService.delete(key);
  }
}
```

- Guard: only runs when `dto.url` is explicitly provided AND the old URL exists
- If `dto.url` is undefined (not provided), skip — no change to URL
- If `translation.url` is empty, skip — nothing to delete
- If `extractKeyFromUrl` returns null (URL doesn't match endpoint/bucket), skip
- Delete failure propagates (matches MangaService hard-failure pattern)

#### `delete()` method

After ownership checks and before `translationRepo.delete()`, delete the associated file:

```typescript
// Inside delete(), after ownership checks, before repo.delete()
if (translation.url) {
  const key = extractKeyFromUrl(
    translation.url,
    this.fileService.endpoint,
    this.fileService.bucket,
  );
  if (key) {
    await this.fileService.delete(key);
  }
}
```

- Guard: only runs when the translation has a URL
- Delete failure propagates

### No changes needed

| File | Reason |
|------|--------|
| `FileService` | Already has `delete(key)`, no changes needed |
| `extractKeyFromUrl` | Already handles the URL format (`{endpoint}/{bucket}/{key}`) |
| `FileModule` | Already `@Global()`, `FileService` available everywhere |
| `MangaModule` | No new imports needed — `FileService` is globally available |

## Testing

### Unit test changes

**File:** `backend/src/modules/manga/services/translation.service.spec.ts`

Tests to add:

1. **`update` deletes old file when new URL provided** — mock `translationRepo.findById` returns translation with `.url = 'old-url'`, call `update` with `dto.url = 'new-url'`, assert `fileService.delete` called with extracted key
2. **`update` does not delete when URL unchanged** — call `update` without `url` in dto, assert `fileService.delete` not called
3. **`update` propagates file delete error** — mock `fileService.delete` to reject, assert the error propagates
4. **`delete` deletes file when translation has URL** — mock translation with `.url`, call `delete`, assert `fileService.delete` called
5. **`delete` does not delete when translation has no URL** — mock translation with `.url = null`, call `delete`, assert `fileService.delete` not called
6. **`delete` propagates file delete error** — mock `fileService.delete` to reject, assert error propagates

## Acceptance Criteria

- [ ] `TranslationService.update` deletes the old file when a new URL is provided
- [ ] `TranslationService.update` does nothing when `url` is not provided
- [ ] `TranslationService.update` propagates file delete errors (hard failure)
- [ ] `TranslationService.delete` deletes the file when translation has a URL
- [ ] `TranslationService.delete` does nothing when translation has no URL
- [ ] `TranslationService.delete` propagates file delete errors (hard failure)
- [ ] `cd backend && npx tsc --noEmit` passes
- [ ] `cd backend && npm test` passes (all tests green)
