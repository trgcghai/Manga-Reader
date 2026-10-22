# Batch Import Data Table Design

## Overview

Upgrade `BatchImportDialog` file list from a simple `<div>` row list to a proper shadcn `<Table>` (data table) with columns: #, Chapter, File Name, Title, Status. This gives users a spreadsheet-like preview of what will be imported and which files couldn't be parsed.

## Zip File Naming Convention

The `parseChapterNumberFromFilename` utility extracts chapter numbers from filenames. Recommended naming for reliable parsing:

| Convention | Example | Reliability |
|---|---|---|
| `chapter<num>.zip` | `chapter12.zip`, `chapter12.5.zip` | ✅ Best |
| `ch<num>.zip` | `ch12.zip`, `ch12.5.zip` | ✅ Good |
| `<num>.zip` | `12.zip`, `12.5.zip` | ✅ Good |
| `v<vol>_ch<num>.zip` | `v03_ch12.zip` | ✅ Supported |
| Anything else | `random-name.zip` | ❌ Unparseable (shows warning) |

The description text in the dialog should recommend `chapterXX.zip` format.

## Table Layout

shadcn `<Table>` replaces the `max-h-48 space-y-1 overflow-y-auto rounded-md border p-2` div.

### Columns

| Column | Width | Content |
|--------|-------|---------|
| # | `w-8` | Auto row index (1-based) |
| Chapter | `w-20` | Parsed chapter number, or `—` for unparseable |
| File Name | auto (grow) | Filename, truncated with `text-ellipsis` |
| Title | `w-24` | Always empty (not editable). Renders `—` or blank |
| Status | `w-24` | `✅ Ready` for parsed, `⚠️ Unparseable` for null |

### Status Logic

```tsx
pf.chapterNumber !== null
  ? { icon: CheckCircle2, text: 'Ready', className: 'text-green-600' }
  : { icon: AlertTriangle, text: 'Unparseable', className: 'text-amber-500' }
```

### Summary

Below the table, same summary line: `"{N} .zip files selected"`, with a "Change folder" link/button to re-pick.

## Changes to Current Implementation

### Additions
- Import `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from `#/components/ui/table`
- Import `CheckCircle2` from `lucide-react` (already has `AlertTriangle`)
- Table header row with sort-indicative styling (not sortable, just visual columns)
- Status cell with icon + text per row

### Removals
- The `max-h-48 space-y-1 overflow-y-auto rounded-md border p-2` wrapper
- The simple `div` per row with `<span>` children

### Unchanged
- `ParsedFile` interface
- `handleFolderSelected`, `handleBrowse`, `handleSubmit`, `canSubmit`
- Folder picker drop zone (hidden input + dashed border area)
- Language `<Select>` + `TranslatorCombobox`
- Submit footer with Cancel + Import buttons
- State reset on close
- All dialog props, hooks

## States

| State | What user sees |
|-------|---------------|
| Initial | Folder picker drop zone (click or Browse button) |
| Folder selected (parsed files) | Table with N rows, each showing parsed data + status. Language + translator selectors. Submit enabled when both filled. |
| Folder selected (no .zips) | Error: "No .zip files found in folder" |
| Submitting | Dialog closes. Toast in background. |
| Re-opened | Fresh reset state |

## Edge Cases

- Single file selected — table still renders with 1 row
- 100+ files — table scrolls (`max-h-64 overflow-y-auto`) within the dialog
- All unparseable — all rows show `⚠️ Unparseable`, submit still works (hook skips nulls)
- Mix of parseable and unparseable — each row shows its own status independently
- File with no chapter number extracted (`parseChapterNumberFromFilename` returns null) — treated as unparseable

## Testing

Existing 12 tests need these adjustments:
- Tests checking for plain text row content (`getByText('5')`, `getByText('?')`) still work (text is in table cells)
- "Mutate and closes dialog on submit" test — no changes needed (table is cosmetic)
- Test for "Ready" status text: `expect(screen.getByText('Ready')).toBeInTheDocument()`
- Test for "Unparseable" status text: `expect(screen.getByText('Unparseable')).toBeInTheDocument()`
