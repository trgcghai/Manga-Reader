import JSZip from 'jszip'
import { IMAGE_EXTENSIONS_REGEX, mimeFromExtension } from '#/constants/file'

export async function parsePages(buffer: ArrayBuffer): Promise<Blob[]> {
  try {
    const zip = await JSZip.loadAsync(buffer)

    const entries = Object.entries(zip.files)
      .filter(([name, file]) => !file.dir && IMAGE_EXTENSIONS_REGEX.test(name))
      .sort(([a], [b]) =>
        new Intl.Collator(undefined, {
          numeric: true,
          sensitivity: 'base',
        }).compare(a, b),
      )

    if (entries.length === 0) {
      throw new Error('No valid page images found in CBZ file')
    }

    return await Promise.all(
      entries.map(async ([name, file]) => {
        const data = await file.async('blob')
        return new Blob([data], { type: mimeFromExtension(name) })
      }),
    )
  } catch (e) {
    console.log('Error in parsePages: ', e)
    throw e
  }
}

export function loadPagesAsObjectUrls(blobs: Blob[]): string[] {
  try {
    return blobs.map((b) => URL.createObjectURL(b))
  } catch (e) {
    console.log('Error in loadPagesAsObjectUrls: ', e)
    throw e
  }
}

export function revokeObjectUrls(urls: string[]): void {
  try {
    urls.forEach((url) => URL.revokeObjectURL(url))
  } catch (e) {
    console.log('Error in revokeObjectUrls: ', e)
  }
}
