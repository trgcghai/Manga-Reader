# Batch Import Dialog Design

## Overview

`BatchImportDialog` — a modal for importing multiple chapter `.zip` files at once via folder selection (`<input webkitdirectory>`). Uses `useBatchImport` (MR95) for background progress with toast.

## File

- `frontend/src/components/chapter/BatchImportDialog.tsx` (named export)

## Props

```ts
interface BatchImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mangaId: number
}
```

## State (vanilla `useState`, no form library)

- `folderFiles: File[]` — filtered `.zip` files from the picked folder
- `parsedFiles: { file: File; chapterNumber: number | null }[]` — computed on selection via `parseChapterNumberFromFilename`
- `languageId: number`
- `translatorId: number`

Reset on close via `useEffect` watching `open`.

## Hooks

- `useBatchImport(mangaId)` from MR95
- `useLanguageList()` — existing

## Folder picker

- Hidden `<input type="file" webkitdirectory multiple accept=".zip">` with `ref`
- Styled `<Button>` triggers click on hidden input
- On selection: filter `files` to `.zip` extension, compute parsed numbers, store in state
- If no `.zip` files: show error message "No .zip files found in folder"

## File list preview

Shown after selection, scrollable (`max-h-48 overflow-y-auto`):
- Each row: parsed chapter number (or "?" if null) + filename
- Warning icon next to unparseable filenames
- Summary: "N .zip files selected"

## Layout (top to bottom)

```
Dialog Header: "Batch Import Chapters"
Description: "Import multiple chapters at once."

Folder picker area (dashed border, Browse button)
Summary line: "12 .zip files selected"
File list (scrollable rows: number + filename)

Separator

Language: <Select>
Translator: <TranslatorCombobox>

Footer: [Cancel] [Import N files]
```

## Submit flow

1. Disabled until: folder selected, `languageId > 0`, `translatorId > 0`
2. On click:
   - Extract `File[]` from `parsedFiles` (all files, including unparseable — hook skips them)
   - Call `batchImport.mutate(files, { languageId, translatorId })`
   - Call `onOpenChange(false)` immediately
3. Dialog closes. Toast handles all progress and result display.

## States

| State | What user sees |
|-------|---------------|
| Initial | Folder picker area. Language + translator dropdowns. Submit disabled. |
| Folder selected | File list preview. "N .zip files selected". Submit enabled if lang + translator filled. |
| Submitting | Dialog closes. Toast in background. |
| Re-opened (anytime) | Fresh initial state. Previous result visible via toast. |

## Edge cases

- No `.zip` files in folder → error message, submit stays disabled
- Pick different folder → state resets with new files
- Close without submitting → state resets on next open
- All filenames unparseable → list shows all "?", hook skips all, final toast: "0 / N imported"
- Concurrent import attempts → guarded by hook's `isRunningRef`

## Testing

- Renders correct states (initial, selected, empty folder)
- Calls `mutate` with correct args on submit, then closes
- Disabled submit button until folder + lang + translator filled
- File list shows parsed numbers correctly
- Empty folder shows error message
- State resets on dialog close
