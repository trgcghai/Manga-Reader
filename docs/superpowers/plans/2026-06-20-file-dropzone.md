# FileDropzone Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install react-dropzone and create a shared `<FileDropzone>` component that unifies drag-and-drop file upload across 5 consumers.

**Architecture:** Single polymorphic component (`frontend/src/components/ui/file-dropzone.tsx`) using `useDropzone` from `react-dropzone`. Props-based auto-detection of visual state (preview > selected > empty). Private helper components in the same file.

**Tech Stack:** react-dropzone, React, Tailwind CSS, Vitest, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-06-20-file-dropzone-design.md`

---

### Task 1: Install react-dropzone

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install react-dropzone**

```bash
cd frontend && npm install react-dropzone
```

Expected: `react-dropzone` added to `dependencies` in `package.json`.

- [ ] **Step 2: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add react-dropzone dependency"
```

---

### Task 2: FileDropzone — empty state and selected states (badge + icon)

**Files:**
- Create: `frontend/src/components/ui/file-dropzone.tsx`
- Create: `frontend/src/__tests__/file-dropzone.spec.tsx`

- [ ] **Step 1: Write failing tests for empty and selected states**

Create `frontend/src/__tests__/file-dropzone.spec.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileDropzone } from '#/components/ui/file-dropzone'

const mockFile = new File([''], 'chapter-1.cbz', { type: 'application/zip' })

describe('FileDropzone', () => {
  describe('empty state', () => {
    it('renders default message when no file is selected', () => {
      render(<FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={vi.fn()} />)
      expect(screen.getByText('Drag and drop your file here, or click to browse')).toBeInTheDocument()
    })

    it('renders custom message when provided', () => {
      render(
        <FileDropzone
          accept={{ 'application/zip': ['.cbz'] }}
          value={null}
          onFileSelect={vi.fn()}
          message="Custom message"
        />,
      )
      expect(screen.getByText('Custom message')).toBeInTheDocument()
    })

    it('renders hint text when provided', () => {
      render(
        <FileDropzone
          accept={{ 'application/zip': ['.cbz'] }}
          value={null}
          onFileSelect={vi.fn()}
          hint="CBZ, ZIP"
        />,
      )
      expect(screen.getByText('CBZ, ZIP')).toBeInTheDocument()
    })

    it('renders Browse Files button', () => {
      render(<FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={vi.fn()} />)
      expect(screen.getByRole('button', { name: /browse/i })).toBeInTheDocument()
    })

    it('renders custom icon when provided', () => {
      render(
        <FileDropzone
          accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
          value={null}
          onFileSelect={vi.fn()}
          icon={<span data-testid="custom-icon">📄</span>}
        />,
      )
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })

    it('applies custom className to root', () => {
      const { container } = render(
        <FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={vi.fn()} className="my-custom-class" />,
      )
      expect(container.firstChild).toHaveClass('my-custom-class')
    })
  })

  describe('selected state — badge', () => {
    it('renders filename in a Badge when value is set and selectedDisplay is badge (default)', () => {
      render(<FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={mockFile} onFileSelect={vi.fn()} />)
      expect(screen.getByText('chapter-1.cbz')).toBeInTheDocument()
    })
  })

  describe('selected state — icon', () => {
    it('renders custom icon and filename when selectedDisplay is icon', () => {
      render(
        <FileDropzone
          accept={{ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}
          value={mockFile}
          onFileSelect={vi.fn()}
          selectedDisplay="icon"
          icon={<span data-testid="file-icon">📄</span>}
        />,
      )
      expect(screen.getByTestId('file-icon')).toBeInTheDocument()
      expect(screen.getByText('chapter-1.cbz')).toBeInTheDocument()
    })
  })

  describe('null value', () => {
    it('shows empty state when value is null', () => {
      const { rerender } = render(
        <FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={mockFile} onFileSelect={vi.fn()} />,
      )
      expect(screen.getByText('chapter-1.cbz')).toBeInTheDocument()
      rerender(<FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={vi.fn()} />)
      expect(screen.getByText('Drag and drop your file here, or click to browse')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/file-dropzone.spec.tsx 2>&1 | head -30
```

Expected: FAIL with "Cannot find module '#/components/ui/file-dropzone'"

- [ ] **Step 3: Create the FileDropzone component with empty and selected states**

Create `frontend/src/components/ui/file-dropzone.tsx`:

```tsx
import { type ReactNode } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'

interface FileDropzoneProps {
  accept: Record<string, string[]>
  onFileSelect: (file: File | null) => void
  value: File | null
  error?: string
  disabled?: boolean
  className?: string
  icon?: ReactNode
  message?: string
  hint?: string
  selectedDisplay?: 'badge' | 'icon' | 'none'
  previewUrl?: string
  onRemove?: () => void
  aspectRatio?: string
}

function EmptyState({
  icon,
  message,
  hint,
}: {
  icon: ReactNode
  message: string
  hint?: string
}) {
  return (
    <>
      {icon}
      <p className="text-sm text-muted-foreground">{message}</p>
      {hint && <p className="text-[11px] text-muted-foreground/60">{hint}</p>}
      <Button type="button" variant="outline" size="sm">
        Browse Files
      </Button>
    </>
  )
}

function SelectedFileBadge({ filename }: { filename: string }) {
  return <Badge className="text-sm font-medium">{filename}</Badge>
}

function SelectedFileIcon({ icon, filename }: { icon: ReactNode; filename: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      {icon}
      <span>{filename}</span>
    </div>
  )
}

function PreviewOverlay({
  previewUrl,
  aspectRatio,
  onRemove,
}: {
  previewUrl: string
  aspectRatio?: string
  onRemove?: () => void
}) {
  return (
    <div className={cn('relative overflow-hidden rounded-lg border bg-muted', aspectRatio ?? '')}>
      <img
        src={previewUrl}
        alt="Preview"
        className="size-full object-cover"
      />
      {onRemove && (
        <div className="absolute inset-x-0 bottom-0 flex gap-1 p-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full text-xs"
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      )}
    </div>
  )
}

export function FileDropzone({
  accept,
  onFileSelect,
  value,
  error,
  disabled = false,
  className,
  icon = <Upload className="size-8 text-muted-foreground" />,
  message = 'Drag and drop your file here, or click to browse',
  hint,
  selectedDisplay = 'badge',
  previewUrl,
  onRemove,
  aspectRatio,
}: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) onFileSelect(acceptedFiles[0])
    },
    accept,
    disabled,
    multiple: false,
  })

  const showPreview = previewUrl !== undefined && previewUrl !== null
  const hasValue = value !== null && value !== undefined

  return (
    <div className="space-y-3">
      {showPreview ? (
        <PreviewOverlay previewUrl={previewUrl} aspectRatio={aspectRatio} onRemove={onRemove} />
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            disabled && 'pointer-events-none opacity-50',
            error && 'border-destructive',
            className,
          )}
          aria-invalid={!!error || undefined}
        >
          <input {...getInputProps()} />
          {hasValue && selectedDisplay === 'badge' && (
            <SelectedFileBadge filename={value.name} />
          )}
          {hasValue && selectedDisplay === 'icon' && (
            <SelectedFileIcon icon={icon} filename={value.name} />
          )}
          {!hasValue && (
            <EmptyState icon={icon} message={message} hint={hint} />
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-normal text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/file-dropzone.spec.tsx 2>&1
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/file-dropzone.tsx frontend/src/__tests__/file-dropzone.spec.tsx
git commit -m "feat: add FileDropzone component with empty and selected states"
```

---

### Task 3: FileDropzone — preview mode, drag-over, error, disabled states, and interaction tests

**Files:**
- Modify: `frontend/src/__tests__/file-dropzone.spec.tsx`
- Modify: `frontend/src/components/ui/file-dropzone.tsx`

- [ ] **Step 1: Add tests for preview mode, drag-over, error, disabled, and interactions**

Append to `frontend/src/__tests__/file-dropzone.spec.tsx` (before the closing `})` of the outer describe):

```tsx
describe('preview mode', () => {
  it('renders image when previewUrl is provided', () => {
    render(
      <FileDropzone
        accept={{ 'image/jpeg': ['.jpg'] }}
        value={null}
        onFileSelect={vi.fn()}
        previewUrl="http://example.com/cover.jpg"
      />,
    )
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'http://example.com/cover.jpg')
  })

  it('renders remove button when onRemove is provided', () => {
    render(
      <FileDropzone
        accept={{ 'image/jpeg': ['.jpg'] }}
        value={null}
        onFileSelect={vi.fn()}
        previewUrl="http://example.com/cover.jpg"
        onRemove={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('calls onRemove when remove button is clicked', async () => {
    const onRemove = vi.fn()
    const { user } = setup(userEvent)
    render(
      <FileDropzone
        accept={{ 'image/jpeg': ['.jpg'] }}
        value={null}
        onFileSelect={vi.fn()}
        previewUrl="http://example.com/cover.jpg"
        onRemove={onRemove}
      />,
    )
    await user.click(screen.getByRole('button', { name: /remove/i }))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it('applies aspectRatio class to preview container', () => {
    const { container } = render(
      <FileDropzone
        accept={{ 'image/jpeg': ['.jpg'] }}
        value={null}
        onFileSelect={vi.fn()}
        previewUrl="http://example.com/cover.jpg"
        aspectRatio="aspect-3/4"
      />,
    )
    const previewDiv = container.firstChild?.firstChild as HTMLElement
    expect(previewDiv).toHaveClass('aspect-3/4')
  })
})

describe('error state', () => {
  it('renders error message when error prop is set', () => {
    render(
      <FileDropzone
        accept={{ 'application/zip': ['.cbz'] }}
        value={null}
        onFileSelect={vi.fn()}
        error="File is required"
      />,
    )
    expect(screen.getByText('File is required')).toBeInTheDocument()
  })

  it('does not render error when error prop is not set', () => {
    const { container } = render(
      <FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={vi.fn()} />,
    )
    expect(container.querySelector('[role="alert"]')).not.toBeInTheDocument()
  })
})

describe('disabled state', () => {
  it('renders disabled class when disabled is true', () => {
    const { container } = render(
      <FileDropzone
        accept={{ 'application/zip': ['.cbz'] }}
        value={null}
        onFileSelect={vi.fn()}
        disabled
      />,
    )
    const dropzone = container.firstChild?.firstChild as HTMLElement
    expect(dropzone).toHaveClass('pointer-events-none')
    expect(dropzone).toHaveClass('opacity-50')
  })
})

describe('interactions', () => {
  it('calls onFileSelect when a file is dropped', () => {
    const onFileSelect = vi.fn()
    const file = new File([''], 'test.cbz', { type: 'application/zip' })
    const { container } = render(
      <FileDropzone accept={{ 'application/zip': ['.cbz'] }} value={null} onFileSelect={onFileSelect} />,
    )
    const dropzone = container.firstChild?.firstChild as HTMLElement
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })
    expect(onFileSelect).toHaveBeenCalledWith(file)
  })
})
```

Add imports at the top of the test file:

```tsx
import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/file-dropzone.spec.tsx 2>&1
```

Expected: All tests PASS. If any fail, fix the component code and re-run.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/__tests__/file-dropzone.spec.tsx
git commit -m "feat: add preview, error, disabled, and interaction tests for FileDropzone"
```

---

### Task 4: Build verification

**Files:**
- No file changes — verification only

- [ ] **Step 1: Run full build**

```bash
cd frontend && npm run build 2>&1
```

Expected: Build succeeds with 0 errors.

- [ ] **Step 2: Commit any final fixes (if needed)**

```bash
git add -A
git commit -m "fix: resolve build issues"
```

---

Plan complete and saved to `docs/superpowers/plans/2026-06-20-file-dropzone.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
