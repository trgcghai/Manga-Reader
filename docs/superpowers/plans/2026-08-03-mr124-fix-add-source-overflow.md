# MR124 — Fix Add Source Form Overflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contain the inline Add Source form within the Manage Sources dialog so inputs and buttons never overflow the dialog's right edge.

**Architecture:** `DialogContent` is a CSS grid whose direct children default to `min-width: auto` and can't shrink below their min-content width. Fix by allowing `SourceForm`'s root container and action row to shrink (`min-w-0`) and wrap (`flex-wrap`), plus a containment check on `CreateTrackingSourceDialog`'s manga Field. No shared-UI (`ui/*`) changes, no backend changes.

**Tech Stack:** React 19, TanStack Start, Tailwind CSS v4, shadcn/ui (`Button`, `Input`, `Field`), TypeScript. No component tests (standing user preference for tracking UI work); verification is `tsc`, `eslint`, `prettier`, and manual browser checks.

---

### Task 1: Contain SourceForm root container

**Files:**
- Modify: `frontend/src/components/tracking/SourceForm.tsx:41`
- Related skills: `frontend-design` (layout/containment), `shadcn` (component conventions)

- [ ] **Step 1: Read the current root container**

Read `frontend/src/components/tracking/SourceForm.tsx` line 41. It currently reads:

```tsx
<div className="flex flex-col gap-4 rounded-md border p-4">
```

- [ ] **Step 2: Apply the containment classes**

Change line 41 to:

```tsx
<div className="flex w-full max-w-full min-w-0 flex-col gap-4 rounded-md border p-4">
```

`min-w-0` is the core fix — it lets the grid item (SourceForm root inside `DialogContent`'s grid) shrink below its min-content width. `w-full` + `max-w-full` make the sizing explicit: fills the content track, never exceeds it.

- [ ] **Step 3: Verify no other code relies on the old class list**

Grep for the exact old string to confirm only one occurrence:

Run: `npx eslint src/components/tracking/SourceForm.tsx`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/tracking/SourceForm.tsx
git commit -m "fix: allow source form to shrink within dialog grid"
```

---

### Task 2: Let the action row shrink and wrap

**Files:**
- Modify: `frontend/src/components/tracking/SourceForm.tsx:71`
- Related skills: `frontend-design` (flex layout), `shadcn` (Button nowrap behavior)

- [ ] **Step 1: Read the current action row**

Read `frontend/src/components/tracking/SourceForm.tsx` line 71. It currently reads:

```tsx
<div className="flex justify-end gap-2">
```

- [ ] **Step 2: Apply the containment classes**

Change line 71 to:

```tsx
<div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
```

`min-w-0` lets the row shrink; `flex-wrap` lets the Cancel/Add buttons drop to a second line at narrow widths (~375px) instead of overflowing the dialog edge. Buttons keep shadcn's `whitespace-nowrap`.

- [ ] **Step 3: Verify lint**

Run: `npx eslint src/components/tracking/SourceForm.tsx && npx prettier --check src/components/tracking/SourceForm.tsx`
Expected: no errors, file is formatted

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/tracking/SourceForm.tsx
git commit -m "fix: wrap source form action buttons instead of overflowing"
```

---

### Task 3: Verify CreateTrackingSourceDialog containment

**Files:**
- Read: `frontend/src/components/tracking/CreateTrackingSourceDialog.tsx`
- Modify (only if overflow observed): `frontend/src/components/tracking/CreateTrackingSourceDialog.tsx:44` (`<Field>` for manga)
- Related skills: `frontend-design` (responsive layout review), `shadcn` (Field/Combobox conventions)

- [ ] **Step 1: Read the dialog's direct DialogContent children**

Read `frontend/src/components/tracking/CreateTrackingSourceDialog.tsx`. The manga `Field` (around line 44) and `SourceForm` (line 57) are direct grid children of `DialogContent`. The Name/URL fields are covered by Tasks 1–2 (shared `SourceForm`). The manga `Field` contains `MangaCombobox` — a shadcn `Button` with `w-full justify-between` (its own min-content risk if the selected title is long).

- [ ] **Step 2: Manual check at narrow widths**

Run `npm run dev` in `frontend/`, open the tracking page, click the header **Add Source** button, and resize to ~375px.

Expected: dialog contained; manga select, Name, URL, and buttons all inside the dialog.

- [ ] **Step 3 (conditional): Add `min-w-0` to the manga Field if it overflows**

Only if the manga field overflows at 375px, change its wrapper to:

```tsx
<Field className="min-w-0 w-full">
```

and verify the same three viewports again (375px, 640px, wide).

- [ ] **Step 4 (conditional): Commit**

Only if Step 3 produced a change:

```bash
git add frontend/src/components/tracking/CreateTrackingSourceDialog.tsx
git commit -m "fix: contain manga field within create source dialog"
```

If no change was needed, skip this commit.

---

### Task 4: Full verification and manual pass

**Files:**
- Read: `frontend/src/components/tracking/ManageSourcesDialog.tsx`, `frontend/src/components/ui/dialog.tsx:61-64`
- Related skills: `frontend-design` (final layout review), superpowers `verification-before-completion` (evidence before completion claims)

- [ ] **Step 1: Typecheck**

From `frontend/`:

Run: `npx tsc --noEmit`
Expected: zero errors in `src/components/tracking/`. Pre-existing baseline errors in unrelated files are acceptable — do NOT fix them. (Verify via: `npx tsc --noEmit 2>&1 | Select-String "components/tracking"` → no matches.)

- [ ] **Step 2: Lint + format on touched files**

Run: `npx eslint src/components/tracking/SourceForm.tsx src/components/tracking/CreateTrackingSourceDialog.tsx`
Expected: no errors

Run: `npx prettier --check src/components/tracking/SourceForm.tsx src/components/tracking/CreateTrackingSourceDialog.tsx`
Expected: all files formatted

- [ ] **Step 3: Manual pass — Manage Sources dialog**

With `npm run dev` running: `admin/tracking` → Manage → **Add Source**, at 375px, 640px, and wide.

Checklist:
- [ ] Form fully contained, no overflow past dialog's right edge
- [ ] Name/URL inputs span available width without overflowing
- [ ] Cancel/Add buttons fully visible; wrap gracefully at 375px
- [ ] Edit flow (row Edit button → same SourceForm) contained
- [ ] No horizontal page scrollbar while dialog is open

- [ ] **Step 4: Manual pass — Create Source dialog**

`admin/tracking` → header **Add Source** → `CreateTrackingSourceDialog`, at 375px, 640px, wide.

Checklist:
- [ ] Manga select, Name, URL, buttons contained
- [ ] No overflow regression from MR122

- [ ] **Step 5: Confirm git state**

Run: `git log --oneline -5`
Expected: the MR124 `fix:` commits from Tasks 1–3 are on top, with no unintended changes staged (`git status` clean of unrelated files).

---

## Notes

- Do NOT modify `frontend/src/components/ui/dialog.tsx` — shared-UI hardening was explicitly out of scope (user decision).
- Do NOT change `sm:max-w-lg` dialog width or add fixed pixel widths.
- No component tests per standing repo preference; the plan's verification is typecheck + lint + format + manual browser checks across three viewport widths.
