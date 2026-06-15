import axiosInstance from '#/services/api/api'

export interface UpdateTranslationPayload {
  languageId?: number
  translatorId?: number
  folderPath?: string
}

export async function updateTranslation(
  mangaId: number,
  chapterId: number,
  translationId: number,
  payload: UpdateTranslationPayload,
): Promise<void> {
  await axiosInstance.patch(
    `/mangas/${mangaId}/chapter/${chapterId}/translations/${translationId}`,
    payload,
  )
}

export async function deleteTranslation(
  mangaId: number,
  chapterId: number,
  translationId: number,
): Promise<void> {
  await axiosInstance.delete(
    `/mangas/${mangaId}/chapter/${chapterId}/translations/${translationId}`,
  )
}
