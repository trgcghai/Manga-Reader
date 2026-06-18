import axiosInstance from '#/services/api/api'

export type UploadFileResponse = {
  key: string
  url: string
}

export async function uploadCover(file: File): Promise<UploadFileResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await axiosInstance.post<UploadFileResponse>(
    '/files/upload/cover',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
  return res.data
}
