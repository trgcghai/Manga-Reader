import { useMutation } from '@tanstack/react-query'
import { uploadCover } from '#/services/api/fileApi'
import type { UploadFileResponse } from '#/services/api/fileApi'

export function useCoverUpload() {
  return useMutation<UploadFileResponse, Error, File>({
    mutationFn: (file: File) => uploadCover(file),
  })
}
