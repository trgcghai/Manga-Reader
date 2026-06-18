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
