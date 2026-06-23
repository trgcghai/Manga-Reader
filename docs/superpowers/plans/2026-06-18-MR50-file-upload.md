# MR50: File Upload for Create/Edit Manga — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace text-based `coverPath` input with a file upload flow that uploads to Minio before form submission.

**Architecture:** The page orchestrates upload-then-submit: `MangaForm` emits form values + cover state, the page uses `useFileUpload` mutation to upload the file, then calls `useCreateManga`/`useUpdateManga` with the returned URL. A dedicated `fileApi.ts` and `useFile.ts` follow existing API patterns.

**Tech Stack:** React, @tanstack/react-form, @tanstack/react-query, Vitest, @testing-library/react

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `frontend/src/services/api/fileApi.ts` | `uploadFile()` POST to `/files/upload` |
| Create | `frontend/src/hooks/useFile.ts` | `useFileUpload()` mutation hook |
| Create | `frontend/src/__tests__/fileApi.spec.ts` | Test `uploadFile` |
| Create | `frontend/src/__tests__/useFile.spec.ts` | Test `useFileUpload` |
| Modify | `frontend/src/components/manga/MangaForm.tsx` | Replace text input with file input + preview |
| Modify | `frontend/src/routes/admin/mangas/new.tsx` | Upload-then-create orchestration |
| Modify | `frontend/src/routes/admin/mangas/$id.edit.tsx` | Upload-then-update + remove cover |
| Modify | `backend/src/modules/manga/services/manga.service.ts:163` | `coverPath: ''` clears the field |

---

### Task 1: Create `fileApi.ts`

**Relevant skill:** None required — pure axios call, no framework-specific patterns.

- [ ] **Step 1: Create file**

```ts
// frontend/src/services/api/fileApi.ts
import axiosInstance from '#/services/api/api'

export type UploadFileResponse = {
  key: string
  url: string
}

export async function uploadFile(file: File): Promise<UploadFileResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await axiosInstance.post<UploadFileResponse>(
    '/files/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
  return res.data
}
```

Follows the `importMangas` pattern from `mangaApi.ts:130-141` — FormData with per-request content-type header. The axios response interceptor unwraps `{ success: true, data: { key, url } }`, so `res.data` is `{ key, url }` directly.

---

### Task 2: Create `useFile.ts`

**Relevant skill:** `tanstack-query-best-practices` for mutation patterns.

- [ ] **Step 1: Create file**

```ts
// frontend/src/hooks/useFile.ts
import { useMutation } from '@tanstack/react-query'
import { uploadFile } from '#/services/api/fileApi'
import type { UploadFileResponse } from '#/services/api/fileApi'

export function useFileUpload() {
  return useMutation<UploadFileResponse, Error, File>({
    mutationFn: (file: File) => uploadFile(file),
  })
}
```

No toast, no cache invalidation — upload is a transient step in the submit flow. The page handles error display.

---

### Task 3: Setup vitest config (needed for frontend tests)

- [ ] **Step 1: Add test environment to vite.config.ts**

```ts
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  server: { port: 3000 },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})

export default config
```

- [ ] **Step 2: Create test setup file**

```ts
// frontend/src/__tests__/setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Run initial test check to confirm vitest works**

Run: `cd frontend && npx vitest run`
Expected: "No test files found" or "0 tests" — just confirming no crash.

---

### Task 4: Test `fileApi.ts`

**Relevant skill:** `vitest` for test patterns and mocking.

- [ ] **Step 1: Write tests**

```ts
// frontend/src/__tests__/fileApi.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axiosInstance from '#/services/api/api'

vi.mock('#/services/api/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('uploadFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts multipart form data to /files/upload', async () => {
    const mockResponse = { key: 'uploads/uuid.jpg', url: 'http://localhost:9000/manga/uploads/uuid.jpg' }
    vi.mocked(axiosInstance.post).mockResolvedValue({ data: mockResponse })

    const { uploadFile } = await import('#/services/api/fileApi')
    const file = new File(['fake-content'], 'cover.jpg', { type: 'image/jpeg' })
    const result = await uploadFile(file)

    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/files/upload',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    expect(result).toEqual(mockResponse)
  })

  it('propagates errors from axios', async () => {
    vi.mocked(axiosInstance.post).mockRejectedValue(new Error('Upload failed'))

    const { uploadFile } = await import('#/services/api/fileApi')
    const file = new File(['fake-content'], 'cover.jpg', { type: 'image/jpeg' })

    await expect(uploadFile(file)).rejects.toThrow('Upload failed')
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd frontend && npx vitest run frontend/src/__tests__/fileApi.spec.ts`
Expected: 2 passed

---

### Task 5: Test `useFile.ts`

**Relevant skill:** `vitest` + `tanstack-query-best-practices` for mutation testing patterns.

- [ ] **Step 1: Write tests**

```ts
// frontend/src/__tests__/useFile.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('#/services/api/fileApi', () => ({
  uploadFile: vi.fn(),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns upload response on success', async () => {
    const mockResponse = { key: 'uploads/uuid.jpg', url: 'http://localhost:9000/manga/uploads/uuid.jpg' }
    const { uploadFile } = await import('#/services/api/fileApi')
    vi.mocked(uploadFile).mockResolvedValue(mockResponse)

    const { useFileUpload } = await import('#/hooks/useFile')
    const { result } = renderHook(() => useFileUpload(), { wrapper: createWrapper() })

    const file = new File(['fake-content'], 'cover.jpg', { type: 'image/jpeg' })
    result.current.mutate(file)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(mockResponse)
  })

  it('sets error state on failure', async () => {
    const { uploadFile } = await import('#/services/api/fileApi')
    vi.mocked(uploadFile).mockRejectedValue(new Error('Network error'))

    const { useFileUpload } = await import('#/hooks/useFile')
    const { result } = renderHook(() => useFileUpload(), { wrapper: createWrapper() })

    const file = new File(['fake-content'], 'cover.jpg', { type: 'image/jpeg' })
    result.current.mutate(file)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error!.message).toBe('Network error')
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd frontend && npx vitest run frontend/src/__tests__/useFile.spec.ts`
Expected: 2 passed

---

### Task 6: Update `MangaForm.tsx` — file input + preview + remove

**Relevant skill:** `react-testing-library` for component tests + `frontend-design` for UI layout.

- [ ] **Step 1: Add `coverFile` and `coverRemoved` to the schema and form props**

Updated schema:
```ts
export const mangaSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  status: z.string(),
  description: z.string(),
  alternativeTitles: z.array(z.string()),
  coverPath: z.string(),
  coverFile: z.instanceof(File).nullable().optional(),
  authors: z.array(z.string()).min(1, 'At least one author required'),
  genres: z.array(z.string()).min(1, 'At least one genre required'),
})
```

Updated props:
```ts
interface MangaFormProps {
  defaultValues: FormValues
  onSubmit: (values: FormValues, coverRemoved: boolean) => void
  isPending: boolean
  error?: string | null
  submitLabel: string
  submitIcon: ReactNode
  cancelLabel: string
  cancelAction?: () => void
  resetOnCancel?: boolean
  heading: string
}
```

- [ ] **Step 2: Replace the text `coverPath` field with file input + preview**

Replace lines 197-209 with:
```tsx
<form.Field name="coverFile">
  {(field) => (
    <UiField>
      <FieldLabel>Cover Image</FieldLabel>
      <div className="flex items-center gap-4">
        {(coverPreview || form.getFieldValue('coverPath')) && (
          <div className="relative size-24 shrink-0 overflow-hidden rounded border">
            <img
              src={coverPreview || form.getFieldValue('coverPath')}
              alt="Cover preview"
              className="size-full object-cover"
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Input
            id="coverFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              field.handleChange(file)
              if (file) {
                setCoverPreview(URL.createObjectURL(file))
                setCoverRemoved(false)
              }
            }}
            className="file:text-foreground cursor-pointer file:cursor-pointer"
          />
          {form.getFieldValue('coverPath') && !coverPreview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                field.handleChange(null)
                setCoverPreview(null)
                setCoverRemoved(true)
              }}
            >
              <X className="size-3" />
              Remove Cover
            </Button>
          )}
        </div>
      </div>
    </UiField>
  )}
</form.Field>
```

- [ ] **Step 3: Add local state for preview and remove**

Add at the top of the component body (after other `useState` calls):
```ts
const [coverPreview, setCoverPreview] = useState<string | null>(null)
const [coverRemoved, setCoverRemoved] = useState(false)
```

- [ ] **Step 4: Update form submit to pass `coverRemoved`**

Change the `form.handleSubmit()` call area. The form's `onSubmit` already calls `onSubmit(value)`, change to:
```tsx
onSubmit: async ({ value }) => onSubmit(value, coverRemoved),
```

- [ ] **Step 5: Clean up object URL on unmount**

```tsx
useEffect(() => {
  return () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
  }
}, [coverPreview])
```

Add the import:
```ts
import { useEffect, useState } from 'react'
```

---

### Task 7: Test `MangaForm.tsx` cover field changes

**Relevant skill:** `react-testing-library` for component testing patterns.

- [ ] **Step 1: Write component tests**

```tsx
// frontend/src/__tests__/MangaForm.spec.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MangaForm, mangaSchema } from '#/components/manga/MangaForm'

const defaultValues = {
  title: '',
  status: 'ongoing',
  description: '',
  alternativeTitles: [],
  coverPath: '',
  coverFile: null,
  authors: [],
  genres: [],
}

describe('MangaForm cover field', () => {
  it('renders file input instead of text input', () => {
    render(
      <MangaForm
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        isPending={false}
        submitLabel="Create"
        submitIcon={<span>+</span>}
        cancelLabel="Cancel"
        heading="Test"
      />,
    )
    const fileInput = screen.getByLabelText('Cover Image')
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('type', 'file')
  })

  it('accepts image file types', () => {
    render(
      <MangaForm
        defaultValues={defaultValues}
        onSubmit={vi.fn()}
        isPending={false}
        submitLabel="Create"
        submitIcon={<span>+</span>}
        cancelLabel="Cancel"
        heading="Test"
      />,
    )
    const fileInput = screen.getByLabelText('Cover Image') as HTMLInputElement
    expect(fileInput.accept).toBe('image/jpeg,image/png,image/webp,image/gif')
  })

  it('shows preview when coverPath exists (edit mode)', () => {
    render(
      <MangaForm
        defaultValues={{ ...defaultValues, coverPath: 'http://example.com/cover.jpg' }}
        onSubmit={vi.fn()}
        isPending={false}
        submitLabel="Save"
        submitIcon={<span>✓</span>}
        cancelLabel="Cancel"
        heading="Edit"
      />,
    )
    const img = screen.getByAltText('Cover preview')
    expect(img).toHaveAttribute('src', 'http://example.com/cover.jpg')
  })

  it('calls onSubmit with coverRemoved=true when Remove is clicked', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <MangaForm
        defaultValues={{ ...defaultValues, coverPath: 'http://example.com/cover.jpg' }}
        onSubmit={onSubmit}
        isPending={false}
        submitLabel="Save"
        submitIcon={<span>✓</span>}
        cancelLabel="Cancel"
        heading="Edit"
      />,
    )

    await user.click(screen.getByText('Remove Cover'))
    await user.click(screen.getByText('Save'))

    expect(onSubmit).toHaveBeenCalledWith(expect.any(Object), true)
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd frontend && npx vitest run frontend/src/__tests__/MangaForm.spec.tsx`
Expected: 4 passed

---

### Task 8: Update `new.tsx` — upload-then-create orchestration

**Relevant skill:** `tanstack-query-best-practices` for mutation chaining patterns.

- [ ] **Step 1: Update `onSubmit` handler**

```tsx
function CreateMangaPage() {
  const navigate = useNavigate()
  const createMutation = useCreateManga()
  const uploadMutation = useFileUpload()
  const [formError, setFormError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  return (
    <MangaForm
      heading="Add Manga"
      defaultValues={{
        title: '',
        status: 'ongoing',
        description: '',
        alternativeTitles: [],
        coverPath: '',
        coverFile: null,
        authors: [],
        genres: [],
      }}
      onSubmit={async (value, coverRemoved) => {
        setFormError(null)
        let coverPath: string | undefined
        if (value.coverFile) {
          setUploading(true)
          try {
            const { url } = await uploadMutation.mutateAsync(value.coverFile)
            coverPath = url
          } catch {
            setFormError('Failed to upload cover image')
            return
          } finally {
            setUploading(false)
          }
        }
        const payload: CreateMangaPayload = {
          title: value.title,
          status: value.status,
          description: value.description || undefined,
          alternativeTitles:
            value.alternativeTitles.length > 0
              ? value.alternativeTitles
              : undefined,
          coverPath,
          authors: value.authors,
          genres: value.genres,
        }
        createMutation.mutate(payload, {
          onSuccess: () => navigate({ to: '/admin/mangas' }),
        })
      }}
      isPending={createMutation.isPending || uploading}
      error={formError || createMutation.error?.message || null}
      submitLabel="Create Manga"
      submitIcon={<Plus className="size-4" />}
      cancelLabel="Reset"
      resetOnCancel
    />
  )
}
```

Add imports:
```ts
import { useState } from 'react'
import { useFileUpload } from '#/hooks/useFile'
```

- [ ] **Step 2: Update submit label for sequential states**

Modify `MangaForm.tsx` submit button to show "Uploading..." when `isPending` and `coverFile` is selected. The `isPending` prop already controls this — the form checks `isPending || isSubmitting`. The page passes `isPending={createMutation.isPending || uploading}`, and when `uploading` is true, the form shows the loading spinner. The label can be handled by passing a dynamic `submitLabel`.

Actually simpler: pass `submitLabel` as `uploading ? 'Uploading...' : (createMutation.isPending ? 'Saving...' : 'Create Manga')`.

Update `new.tsx` submitLabel:
```tsx
submitLabel={uploading ? 'Uploading...' : createMutation.isPending ? 'Saving...' : 'Create Manga'}
```

---

### Task 9: Update `$id.edit.tsx` — upload + remove cover

**Relevant skill:** `tanstack-query-best-practices` for mutation orchestration.

- [ ] **Step 1: Update `onSubmit` handler**

```tsx
function EditMangaPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: manga, isLoading, isError } = useManga(Number(id))
  const updateMutation = useUpdateManga()
  const uploadMutation = useFileUpload()
  const [formError, setFormError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // ... existing loading/error guards ...

  return (
    <MangaForm
      heading="Edit Manga"
      defaultValues={{
        title: manga.title,
        status: manga.status,
        description: manga.description ?? '',
        alternativeTitles: manga.alternativeTitles ?? [],
        coverPath: manga.coverPath ?? '',
        coverFile: null,
        authors: manga.authors.map((a) => a.name),
        genres: manga.genres.map((g) => g.name),
      }}
      onSubmit={async (value, coverRemoved) => {
        setFormError(null)
        let coverPath: string | undefined
        if (value.coverFile) {
          setUploading(true)
          try {
            const { url } = await uploadMutation.mutateAsync(value.coverFile)
            coverPath = url
          } catch {
            setFormError('Failed to upload cover image')
            return
          } finally {
            setUploading(false)
          }
        } else if (coverRemoved) {
          coverPath = ''
        }
        const payload: UpdateMangaPayload = {}
        if (value.title !== manga.title) payload.title = value.title
        if (value.status !== manga.status) payload.status = value.status
        if (value.description !== (manga.description ?? '')) {
          payload.description = value.description || undefined
        }
        if (coverPath !== undefined) payload.coverPath = coverPath
        if (
          JSON.stringify(value.alternativeTitles) !==
          JSON.stringify(manga.alternativeTitles)
        ) {
          payload.alternativeTitles =
            value.alternativeTitles.length > 0
              ? value.alternativeTitles
              : undefined
        }
        if (
          JSON.stringify(value.authors) !==
          JSON.stringify(manga.authors.map((a) => a.name))
        ) {
          payload.authors = value.authors
        }
        if (
          JSON.stringify(value.genres) !==
          JSON.stringify(manga.genres.map((g) => g.name))
        ) {
          payload.genres = value.genres
        }
        updateMutation.mutate(
          { id: Number(id), data: payload },
          { onSuccess: () => navigate({ to: '/admin/mangas' }) },
        )
      }}
      isPending={updateMutation.isPending || uploading}
      error={formError || updateMutation.error?.message || null}
      submitLabel={uploading ? 'Uploading...' : updateMutation.isPending ? 'Saving...' : 'Save Changes'}
      submitIcon={<Save className="size-4" />}
      cancelLabel="Cancel"
      cancelAction={() => navigate({ to: '/admin/mangas' })}
    />
  )
}
```

Add imports:
```ts
import { useState } from 'react'
import { useFileUpload } from '#/hooks/useFile'
```

---

### Task 10: Update backend — allow `coverPath: ''` to clear the field

**Relevant skill:** None required — one-line change.

- [ ] **Step 1: Change conditional in `manga.service.ts:163`**

```ts
// Before:
if (dto.coverPath) updateData.coverPath = dto.coverPath;

// After:
if (dto.coverPath !== undefined) updateData.coverPath = dto.coverPath;
```

This allows `coverPath: ''` to reach the repository and clear the field.

- [ ] **Step 2: Verify existing backend tests still pass**

Run: `cd backend && npm test`
Expected: All tests pass (no behavior change for truthy values)

---

### Task 11: Run full test suite

- [ ] **Step 1: Run all frontend tests**

Run: `cd frontend && npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run all backend tests**

Run: `cd backend && npm test`
Expected: All tests pass

- [ ] **Step 3: Run lint on both**

Run: `cd frontend && npm run lint` and `cd backend && npm run lint`
Expected: No lint errors
