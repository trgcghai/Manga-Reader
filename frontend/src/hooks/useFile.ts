import { useMutation } from '@tanstack/react-query'
import {
  uploadCover,
  uploadTranslation,
  downloadFile,
} from '#/services/api/fileApi'
import type { UploadFileResponse } from '#/services/api/fileApi'
import { toast } from 'sonner'

export function useCoverUpload() {
  return useMutation<UploadFileResponse, Error, File>({
    mutationFn: (file: File) => uploadCover(file),
    onError: (error) => {
      console.error('Error uploading cover:', error)
      toast.error('Failed to upload cover. Please try again.')
    },
    onSuccess: () => {
      toast.success('Cover uploaded successfully.')
    },
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
    onError: (error) => {
      console.error('Error uploading translation file:', error)
      toast.error('Failed to upload translation file. Please try again.')
    },
    onSuccess: () => {
      toast.success('Translation file uploaded successfully.')
    },
  })
}

interface UseFileDownloadParams {
  showErrorToast?: boolean
  showSuccessToast?: boolean
}

export function useFileDownload({
  showErrorToast = true,
  showSuccessToast = true,
}: UseFileDownloadParams = {}) {
  return useMutation<Blob, Error, string>({
    mutationFn: (url: string) => downloadFile(url),
    onError: (error) => {
      console.error('Error downloading file:', error)
      if (showErrorToast) {
        toast.error('Failed to download file. Please try again.')
      }
    },
    onSuccess: () => {
      if (showSuccessToast) {
        toast.success('File downloaded successfully.')
      }
    },
  })
}
