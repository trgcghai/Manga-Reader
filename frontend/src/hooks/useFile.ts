import { useMutation } from '@tanstack/react-query'
import { uploadFile } from '#/services/api/fileApi'
import type { UploadFileResponse } from '#/services/api/fileApi'

export function useFileUpload() {
  return useMutation<UploadFileResponse, Error, File>({
    mutationFn: (file: File) => uploadFile(file),
  })
}
