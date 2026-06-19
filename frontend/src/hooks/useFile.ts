import { useMutation } from '@tanstack/react-query'
import {
  uploadCover,
  uploadTranslation,
  downloadFile,
} from '#/services/api/fileApi'
import type { UploadFileResponse } from '#/services/api/fileApi'

export function useCoverUpload() {
  return useMutation<UploadFileResponse, Error, File>({
    mutationFn: (file: File) => uploadCover(file),
  })
}

export function useTranslationFileUpload(mangaId: number) {
  return useMutation<
    UploadFileResponse,
    Error,
    { file: File; chapterNumber: number }
  >({
    mutationFn: ({ file, chapterNumber }) =>
      uploadTranslation(file, mangaId, chapterNumber),
  })
}

export function useFileDownload() {
  return useMutation<Blob, Error, string>({
    mutationFn: (url: string) => downloadFile(url),
  })
}
