# Batch Import Data Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `BatchImportDialog` file list from plain `<div>` rows to a shadcn `<Table>` with columns (#, Chapter, File Name, Title, Status) and document zip naming convention in the dialog description.

**Architecture:** Single-file change to `frontend/src/components/chapter/BatchImportDialog.tsx`. Table uses shadcn `TableHeader` with sticky column labels. Status uses icons: `CheckCircle2` (parsed) / `AlertTriangle` (unparseable). Tests updated for the new status column text.

**Tech Stack:** React 19, shadcn/ui (Table, Button, Dialog, Select), lucide-react (CheckCircle2, AlertTriangle), Vitest + Testing Library.

**Related skills:** `shadcn` (Table components), `react-testing-library` (component tests), `vitest` (test runner), `test-driven-development` (write failing test first).

---

### Task 1: Update spec with Status column test expectations

**Files:**
- Modify: `frontend/src/components/chapter/BatchImportDialog.spec.tsx`

- [ ] **Step 1: Update existing tests for table layout**

Changes to the test file:
- After file selection, check for "Ready" status text (not just chapter number):
  ```tsx
  expect(screen.getByText('Ready')).toBeInTheDocument()
  ```
- After selecting unparseable file, check for "Unparseable" status text (not just "?"):
  ```tsx
  expect(screen.getByText('Unparseable')).toBeInTheDocument()
  ```
- Verify table header columns render:
  ```tsx
  expect(screen.getByText('File Name')).toBeInTheDocument()
  expect(screen.getByText('Status')).toBeInTheDocument()
  ```
- Run test to see it fail (component not updated yet)

- [ ] **Step 2: Run failing test**

```bash
cd frontend && npx vitest run src/components/chapter/BatchImportDialog.spec.tsx
```
Expected: FAIL — tests for "Ready", "Unparseable", table headers not found

### Task 2: Upgrade `BatchImportDialog` component

**Files:**
- Modify: `frontend/src/components/chapter/BatchImportDialog.tsx`

- [ ] **Step 3: Add Table imports**

Add to imports:
```tsx
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '#/components/ui/table'
import { FolderOpen, AlertTriangle, CheckCircle2 } from 'lucide-react'
```

- [ ] **Step 4: Replace file list div with shadcn Table**

Replace the `max-h-48...` div block with:

```tsx
<div className="max-h-64 overflow-y-auto rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="w-8">#</TableHead>
        <TableHead className="w-20">Chapter</TableHead>
        <TableHead>File Name</TableHead>
        <TableHead className="w-24">Title</TableHead>
        <TableHead className="w-28">Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {parsedFiles.map((pf, i) => (
        <TableRow key={i}>
          <TableCell className="text-muted-foreground text-xs font-mono">{i + 1}</TableCell>
          <TableCell>
            {pf.chapterNumber !== null ? (
              <span className="font-mono">{pf.chapterNumber}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="max-w-0 truncate" title={pf.file.name}>
            {pf.file.name}
          </TableCell>
          <TableCell className="text-muted-foreground">—</TableCell>
          <TableCell>
            {pf.chapterNumber !== null ? (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="size-3.5" />
                Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                <AlertTriangle className="size-3.5" />
                Unparseable
              </span>
            )}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

- [ ] **Step 5: Update dialog description**

Change description text to recommend naming convention:
```tsx
<DialogDescription>
  Select a folder of .zip chapter files named `chapterXX.zip` (e.g., `chapter12.zip`, `chapter12.5.zip`).
</DialogDescription>
```

- [ ] **Step 6: Remove unused imports**

Remove `AlertTriangle` from body if no longer used inline (now only used in table). Keep it in imports—still used there.

- [ ] **Step 7: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/components/chapter/BatchImportDialog.spec.tsx
```
Expected: PASS — all 12+ tests pass

- [ ] **Step 8: Run full test suite**

```bash
cd frontend && npm run test
```
Expected: 39 tests pass (4 files)

- [ ] **Step 9: Run type check**

```bash
cd frontend && npm run check
```
Expected: 0 errors

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/chapter/BatchImportDialog.tsx frontend/src/components/chapter/BatchImportDialog.spec.tsx docs/superpowers/specs/2026-06-24-batch-import-table-design.md docs/superpowers/plans/2026-06-24-batch-import-table.md
git commit -m "feat: upgrade batch import file list to shadcn data table"
```
