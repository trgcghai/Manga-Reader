# Chapter Title Parsing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename and extend `parseChapterNumberFromFilename` to also extract chapter titles from `chapter XX - Title.zip` patterns, showing them in the batch import table.

**Architecture:** Single utility function returning `{ chapterNumber, title }` instead of just a number. Only consumer is `BatchImportDialog.tsx`. No backend changes.

**Tech Stack:** TypeScript, Vitest, React Testing Library, shadcn/ui (Table).

**Related skills:** `test-driven-development` (TDD workflow), `vitest` (test runner), `react-testing-library` (component tests).

---

### Task 1: Update utility function + tests

**Files:**
- Modify: `frontend/src/utils/parseChapterNumber.ts`
- Modify: `frontend/src/utils/parseChapterNumber.spec.ts`

**Related skills:** `test-driven-development`, `vitest`

- [ ] **Step 1: Write failing tests for title extraction**

Update `parseChapterNumber.spec.ts`:
- Rename all `parseChapterNumberFromFilename` references to `parseChapterInfoFromFilename`
- Change return value assertions from `toBe(N)` to `toEqual({ chapterNumber: N, title: null })` (for existing cases without titles)
- Add new test cases for title extraction:

```ts
import { describe, it, expect } from 'vitest'
import { parseChapterInfoFromFilename } from './parseChapterNumber'

describe('parseChapterInfoFromFilename', () => {
  it('extracts number from "chapter 1.cbz"', () => {
    expect(parseChapterInfoFromFilename('chapter 1.cbz')).toEqual({
      chapterNumber: 1,
      title: null,
    })
  })

  it('extracts number and title from "chapter 001 - The Beginning.zip"', () => {
    expect(
      parseChapterInfoFromFilename('chapter 001 - The Beginning.zip'),
    ).toEqual({ chapterNumber: 1, title: 'The Beginning' })
  })

  it('extracts title with multiple words', () => {
    expect(
      parseChapterInfoFromFilename('ch 12 - A New Chapter.zip'),
    ).toEqual({ chapterNumber: 12, title: 'A New Chapter' })
  })

  it('returns null title when no separator present', () => {
    expect(parseChapterInfoFromFilename('chapter05.zip')).toEqual({
      chapterNumber: 5,
      title: null,
    })
  })

  it('trims surrounding whitespace from title', () => {
    expect(
      parseChapterInfoFromFilename('chapter 1 -   Extra Spaces  .zip'),
    ).toEqual({ chapterNumber: 1, title: 'Extra Spaces' })
  })

  it('returns null for non-chapter filenames', () => {
    expect(parseChapterInfoFromFilename('readme.txt')).toEqual({
      chapterNumber: null,
      title: null,
    })
  })

  it('extracts number from "c002.zip" stripping leading zeros', () => {
    expect(parseChapterInfoFromFilename('c002.zip')).toEqual({
      chapterNumber: 2,
      title: null,
    })
  })

  it('extracts decimal number from "c200.4.cbz"', () => {
    expect(parseChapterInfoFromFilename('c200.4.cbz')).toEqual({
      chapterNumber: 200.4,
      title: null,
    })
  })

  it('extracts decimal number from "chapter 100.1.zip"', () => {
    expect(parseChapterInfoFromFilename('chapter 100.1.zip')).toEqual({
      chapterNumber: 100.1,
      title: null,
    })
  })

  it('is case-insensitive ("ChApTeR 5.cbz")', () => {
    expect(parseChapterInfoFromFilename('ChApTeR 5.cbz')).toEqual({
      chapterNumber: 5,
      title: null,
    })
  })

  it('catches leading number without prefix ("03-scan.cbz")', () => {
    expect(parseChapterInfoFromFilename('03-scan.cbz')).toEqual({
      chapterNumber: 3,
      title: 'scan',
    })
  })

  it('returns null for filename with no number ("chapter.cbz")', () => {
    expect(parseChapterInfoFromFilename('chapter.cbz')).toEqual({
      chapterNumber: null,
      title: null,
    })
  })

  it('accepts custom pattern override', () => {
    const custom = /ep(\d+)(?:\s*-\s*(.+))?$/i
    expect(parseChapterInfoFromFilename('ep05.cbz', custom)).toEqual({
      chapterNumber: 5,
      title: null,
    })
    expect(parseChapterInfoFromFilename('chapter 1.cbz', custom)).toEqual({
      chapterNumber: null,
      title: null,
    })
  })

  it('handles "chapter - No Number.zip"', () => {
    expect(parseChapterInfoFromFilename('chapter - No Number.zip')).toEqual({
      chapterNumber: null,
      title: null,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/utils/parseChapterNumber.spec.ts
```
Expected: FAIL — `parseChapterInfoFromFilename` not exported from module

- [ ] **Step 3: Update implementation**

Replace `parseChapterNumber.ts` contents:

```ts
export const DEFAULT_CHAPTER_PATTERN =
  /^(?:chapter\s*|ch\s*|c\s*)?(\d+(?:\.\d+)?)(?:\s*-\s*(.+))?$/i

export function parseChapterInfoFromFilename(
  filename: string,
  pattern: RegExp = DEFAULT_CHAPTER_PATTERN,
): { chapterNumber: number | null; title: string | null } {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
  const match = nameWithoutExt.match(pattern)
  if (!match) return { chapterNumber: null, title: null }
  const title = match[2] ? match[2].trim() : null
  return { chapterNumber: parseFloat(match[1]), title }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/utils/parseChapterNumber.spec.ts
```
Expected: PASS — all 14 tests pass

### Task 2: Update BatchImportDialog

**Files:**
- Modify: `frontend/src/components/chapter/BatchImportDialog.tsx`
- Modify: `frontend/src/components/chapter/BatchImportDialog.spec.tsx`

**Related skills:** `react-testing-library` (component test updates)

- [ ] **Step 5: Update BatchImportDialog.spec.tsx**

Update existing test for "shows parsed chapter numbers in file list" to assert on the new import name (tests already check UI text, not utility internals, so minimal changes needed):

No changes needed for existing 14 tests — they check rendered text ("Ready", "Unparseable", `"5"`), not the utility function directly. The `mutate` test at line 256 checks `chapterNumber: 1` which still works since the dialog destructures `{ chapterNumber, title }` identically.

Add one new test to verify title appears in the table:

```tsx
it('shows parsed title in Title column', async () => {
  const user = userEvent.setup()
  render(<BatchImportDialog {...defaultProps} />, {
    wrapper: createWrapper(),
  })

  const file = new File([''], 'chapter 1 - The Beginning.zip', {
    type: 'application/zip',
  })
  const input = screen.getByTestId('folder-input')
  await user.upload(input, [file])

  expect(screen.getByText('The Beginning')).toBeInTheDocument()
})
```

- [ ] **Step 6: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/components/chapter/BatchImportDialog.spec.tsx
```
Expected: FAIL — "The Beginning" text not found (dialog still shows `—` in Title column)

- [ ] **Step 7: Update BatchImportDialog.tsx**

Three changes needed:

1. Update import:
```tsx
import { parseChapterInfoFromFilename } from '#/utils/parseChapterNumber'
```

2. Update `ParsedFile` interface:
```tsx
interface ParsedFile {
  file: File
  chapterNumber: number | null
  title: string | null
}
```

3. Update `handleFolderSelected` parse call:
```tsx
const info = parseChapterInfoFromFilename(file.name)
parsed.push({ file, chapterNumber: info.chapterNumber, title: info.title })
```

4. Update Title cell in the table:
```tsx
<TableCell className="text-muted-foreground">
  {pf.title ?? '—'}
</TableCell>
```

- [ ] **Step 8: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/components/chapter/BatchImportDialog.spec.tsx
```
Expected: PASS — 15 tests pass

- [ ] **Step 9: Run full test suite + type check**

```bash
cd frontend && npm run test && npm run check
```
Expected: 42+ tests pass, TS type check shows only pre-existing errors

- [ ] **Step 10: Commit**

```bash
git add frontend/src/utils/parseChapterNumber.ts frontend/src/utils/parseChapterNumber.spec.ts frontend/src/components/chapter/BatchImportDialog.tsx frontend/src/components/chapter/BatchImportDialog.spec.tsx docs/superpowers/specs/2026-06-24-chapter-title-parsing-design.md docs/superpowers/plans/2026-06-24-chapter-title-parsing.md
git commit -m "feat: parse chapter title from filename and display in batch import table"
```
