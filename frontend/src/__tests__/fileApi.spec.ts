import { describe, it, expect, vi, beforeEach } from 'vitest'
import axiosInstance from '#/services/api/api'

vi.mock('#/services/api/api', () => ({
  default: {
    post: vi.fn(),
  },
}))

describe('uploadCover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts multipart form data to /files/upload/cover', async () => {
    const mockResponse = {
      key: 'manga/cover/uuid.jpg',
      url: 'http://localhost:9000/manga-pages/manga/cover/uuid.jpg',
    }
    vi.mocked(axiosInstance.post).mockResolvedValue({ data: mockResponse })

    const { uploadCover } = await import('#/services/api/fileApi')
    const file = new File(['fake-content'], 'cover.jpg', { type: 'image/jpeg' })
    const result = await uploadCover(file)

    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/files/upload/cover',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    expect(result).toEqual(mockResponse)
  })

  it('propagates errors from axios', async () => {
    vi.mocked(axiosInstance.post).mockRejectedValue(new Error('Upload failed'))

    const { uploadCover } = await import('#/services/api/fileApi')
    const file = new File(['fake-content'], 'cover.jpg', { type: 'image/jpeg' })

    await expect(uploadCover(file)).rejects.toThrow('Upload failed')
  })
})
