import axiosInstance from '#/services/api/api'

export interface CreateChapterPayload {
  number: number
  title: string
  releaseDate?: string
  note?: string
  languageId: number
  translatorId: number
  folderPath: string
}

export async function createChapter(
  mangaId: number,
  data: CreateChapterPayload,
): Promise<void> {
  await axiosInstance.post(`/mangas/${mangaId}/chapter`, data)
}
