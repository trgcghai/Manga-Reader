# Reader Page Jump Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Jump to Page" Select dropdown in ReaderSettingsSheet for quick page navigation in page mode.

**Architecture:** Add `getPageItems` utility function (module-level), read `currentPage`/`totalPages`/`setCurrentPage` from store, add JSX section after Jump to Chapter, before Display Mode. Only renders in page mode.

**Tech Stack:** React, Zustand, shadcn/ui (Select already available)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/components/reader/ReaderSettingsSheet.tsx` | Modify | Add utility function, store reads, JSX section |

---

### Task 1: Add page jump Select to ReaderSettingsSheet

**Related skills:** `frontend-design`, `shadcn`, `zustand`

**Files:**
- Modify: `frontend/src/components/reader/ReaderSettingsSheet.tsx`

- [ ] **Add `getPageItems` utility function** before the `ReaderSettingsSheetProps` interface (at module level, outside the component):

```typescript
function getPageItems(displayMode: 'single' | 'double', totalPages: number) {
  if (displayMode === 'single') {
    return Array.from({ length: totalPages }, (_, i) => ({
      value: String(i),
      label: String(i + 1),
    }))
  }
  const items: { value: string; label: string }[] = []
  for (let i = 0; i < totalPages; i += 2) {
    const end = Math.min(i + 2, totalPages)
    items.push({
      value: String(i),
      label: end - i === 2 ? `${i + 1}-${end}` : String(i + 1),
    })
  }
  return items
}
```

- [ ] **Add store reads** inside the component, alongside the existing store reads:

```typescript
  const currentPage = useReaderStore((s) => s.currentPage)
  const totalPages = useReaderStore((s) => s.totalPages)
  const setCurrentPage = useReaderStore((s) => s.setCurrentPage)
```

- [ ] **Add JSX section** after the Jump to Chapter section (after the closing `</>`) and before the Display Mode section:

```tsx
          {readingMode === 'page' && totalPages > 0 && (
            <>
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Jump to Page
                </h3>
                <Select value={String(currentPage)} onValueChange={(v) => setCurrentPage(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getPageItems(displayMode, totalPages).map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
            </>
          )}
```

- [ ] **Verify compilation**

Run: `cd frontend && npx tsc --noEmit`

Expected: No new errors

- [ ] **Verify build**

Run: `cd frontend && npm run build`

Expected: 0 errors

---

### Task 2: Commit

- [ ] **Stage and commit**

```bash
git add frontend/src/components/reader/ReaderSettingsSheet.tsx
git commit -m "feat: add page jump select to reader settings"
```
