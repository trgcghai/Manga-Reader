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
