# Chapter Title Parsing from Filename Design

## Overview

Extend the existing `parseChapterNumberFromFilename` utility to also extract chapter titles from filenames following the `chapter XX - Title.zip` convention, and display parsed titles in the batch import dialog's data table.

## Design Decisions

- Rename existing function rather than creating a new one (single source of truth)
- Only ` - ` (space-dash-space) is recognized as the title separator
- Title is trimmed of leading/trailing whitespace after extraction
- `parseChapterNumberFromFilename` is removed entirely (no backward compat needed — only used in BatchImportDialog)

## Regex Change

**Before:**
```
/^(?:chapter\s*|ch\s*|c\s*)?(\d+(?:\.\d+)?)/i
```

**After:**
```
/^(?:chapter\s*|ch\s*|c\s*)?(\d+(?:\.\d+)?)(?:\s*-\s*(.+))?$/i
```

- `(?:\s*-\s*(.+))?$` — optional non-capturing group matching ` - ` followed by title characters
- `$` anchor ensures the full name is consumed
- Captured title is `.trim()`'d to remove surrounding whitespace

## Files

| File | Change |
|------|--------|
| `frontend/src/utils/parseChapterNumber.ts` | Rename function, change return type, update regex, add title trim |
| `frontend/src/utils/parseChapterNumber.spec.ts` | Rename calls, update assertions to check object shape, add title test cases |
| `frontend/src/components/chapter/BatchImportDialog.tsx` | Update import name, destructure `{ chapterNumber, title }`, add `title` to `ParsedFile`, render in table |

## API

```ts
function parseChapterInfoFromFilename(
  filename: string,
  pattern?: RegExp,
): { chapterNumber: number | null; title: string | null }
```

## Edge Cases

| Filename | Result |
|----------|--------|
| `chapter 001 - The Beginning.zip` | `{ chapterNumber: 1, title: "The Beginning" }` |
| `ch 12 - A New Chapter.zip` | `{ chapterNumber: 12, title: "A New Chapter" }` |
| `chapter05.zip` | `{ chapterNumber: 5, title: null }` |
| `chapter 1 -   Extra Spaces  .zip` | `{ chapterNumber: 1, title: "Extra Spaces" }` |
| `random.zip` | `{ chapterNumber: null, title: null }` |
| `03-scan.zip` | `{ chapterNumber: 3, title: "scan" }` |
| `chapter - No Number.zip` | `{ chapterNumber: null, title: null }` (no number captured) |
