import axiosInstance from '#/services/api/api'

export interface LanguageResponse {
  id: number
  code: string
  name: string
  createdAt: string
  updatedAt: string
}

export async function getLanguages(): Promise<LanguageResponse[]> {
  const { data } = await axiosInstance.get<LanguageResponse[]>('/language')
  return data
}
