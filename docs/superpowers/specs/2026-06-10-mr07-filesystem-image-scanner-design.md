# MR07 Filesystem Image Scanner Design

## Summary

MR07 adds a backend endpoint that scans a client-supplied local directory path and returns direct child image files. It is offline-only, reads from the local filesystem at request time, and does not upload, copy, persist, or recursively scan files.

## Scope

The endpoint scans only the immediate children of the requested path. It returns files with these extensions, matched case-insensitively:

- `jpg`
- `jpeg`
- `png`
- `webp`
- `gif`

Directories, nested images, and non-image files are ignored. Empty readable directories return an empty image list.

## API

Expose the scanner through the existing chapter API:

```http
GET /chapter/scan?path=<url-encoded-local-path>
```

Example:

```http
GET /chapter/scan?path=D%3A%2FManga%2FChapter%20001
```

Response:

```ts
{
  path: string;
  images: Array<{
    name: string;
    path: string;
    extension: 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif';
  }>;
}
```

The returned `path` is the scanned path after backend normalization. Each image `path` is the full local path to that image.

## Architecture

Add a `ChapterScannerService` inside `backend/src/modules/chapter/`. The service owns filesystem behavior and exposes a method like `scanImages(path: string)`.

The existing `ChapterController` gets a new `GET /chapter/scan` handler. The controller reads the `path` query parameter, calls `ChapterScannerService`, and returns the DTO. The controller should stay thin so the scanner can be tested directly without HTTP.

## Data Flow

```text
GET /chapter/scan?path=...
  -> ChapterController.scan()
  -> ChapterScannerService.scanImages(path)
  -> fs.readdir(path, { withFileTypes: true })
  -> keep direct child files only
  -> keep supported image extensions only
  -> natural sort by filename
  -> return scanner DTO
```

No database access is required for MR07.

## Sorting

Images are returned in natural filename order so numeric names sort predictably:

```text
001.jpg
002.webp
010.png
```

Sorting should be stable and deterministic across operating systems.

## Error Handling

The endpoint fails gracefully with client-facing `400 Bad Request` errors for invalid input or unreadable filesystem paths:

- missing or empty `path`
- path does not exist
- path exists but is not a directory
- path cannot be read due to permissions or filesystem errors

Readable directories with no matching image files return `200 OK` and `images: []`.

Error responses should use clear messages and should not expose stack traces or raw low-level filesystem details.

## Testing

Add fixture-based tests for the scanner service. A suitable fixture layout is:

```text
backend/src/modules/chapter/__fixtures__/scan-images/
  mixed/
    001.jpg
    010.png
    002.webp
    COVER.JPEG
    animated.GIF
    notes.txt
    archive.cbz
    nested-folder/
      ignored.jpg
  empty/
```

Service tests should cover:

- returns only direct child image files
- ignores directories, nested images, and non-image files
- supports `jpg`, `jpeg`, `png`, `webp`, and `gif` case-insensitively
- returns images in natural filename order
- returns an empty list for an empty readable folder
- throws a clear bad-request-style error for missing, unreadable, or non-directory paths

Controller tests should cover:

- `GET /chapter/scan?path=...` passes the query path to the scanner service
- successful scanner responses are returned unchanged
- missing query path returns a `400 Bad Request`

## Out of Scope

MR07 does not:

- recursively scan folders
- discover manga folders
- parse metadata
- read image dimensions
- create database records
- serve image bytes
- upload or copy user files
