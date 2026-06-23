# FileDropzone — Shared Drag-and-Drop Component

- **Date:** 2026-06-20
- **Task:** MR69 — Install react-dropzone and create shared FileDropzone component
- **Consumers:** AddChapterDialog, AddTranslationDialog, EditTranslationDialog, ImportDialog, MangaForm

## Props API

```ts
interface FileDropzoneProps {
  accept: Record<string, string[]>
  onFileSelect: (file: File | null) => void
  value: File | null
  error?: string
  disabled?: boolean
  className?: string

  icon?: ReactNode              // defaults to <Upload className="size-8 text-muted-foreground" />
  message?: string              // defaults to "Drag and drop your file here, or click to browse"
  hint?: string

  selectedDisplay?: 'badge' | 'icon' | 'none'
  previewUrl?: string
  onRemove?: () => void
  aspectRatio?: string
}
```

- `accept` uses `useDropzone`'s native `Record<string, string[]>` format (e.g., `{ 'application/zip': ['.cbz', '.zip'] }`)
- `onFileSelect(null)` signals clearing
- `selectedDisplay` defaults to `'badge'`

## Visual States (priority order)

1. **Preview** (`previewUrl` set) — `<img>` + remove overlay, `aspectRatio` constraint
2. **Selected — badge** (`value` set, `selectedDisplay='badge'`) — `<Badge>` with filename
3. **Selected — icon** (`value` set, `selectedDisplay='icon'`) — custom icon + filename
4. **Empty** — icon + message + hint + Browse button
5. **Drag-over** (transient) — `border-primary bg-primary/5`
6. **Error** — red dashed border, error text below
7. **Disabled** — `opacity-50 pointer-events-none`

## Internal Architecture

Single file: `frontend/src/components/ui/file-dropzone.tsx`

- Uses `useDropzone({ onDrop, accept, disabled, multiple: false })` — `accept` is passed through directly
- `getRootProps()` on container, `getInputProps()` on hidden input
- `isDragActive` drives drag-over visual
- Private helpers (same file): `EmptyState`, `SelectedFileBadge`, `SelectedFileIcon`, `PreviewOverlay`
- All 4 helpers are small — no separate files needed

## Edge Cases

- Invalid file type → `useDropzone` rejects, no callback
- Multiple files → `multiple: false`, first accepted file used
- Preview URL changes → image re-renders (consumer manages object URLs)
- `value` null/undefined → empty state
- Remove button → calls `onRemove` + `onFileSelect(null)`

## Testing

File: `frontend/src/__tests__/file-dropzone.spec.tsx`

Tests cover: empty, selected badge, selected icon, preview, remove button, drop event, input change, drag-over styling, error message, disabled state, null value, custom props, custom className.

Minimal mocking — mock `useDropzone` only for `isDragActive`; use native `fireEvent` for drop/change.
