import JSZip from 'jszip'

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp)$/i

function mimeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    default:
      return 'image/jpeg'
  }
}

export async function parseCbzPages(buffer: ArrayBuffer): Promise<Blob[]> {
  try {
    const zip = await JSZip.loadAsync(buffer)

    const entries = Object.entries(zip.files)
      .filter(([name, file]) => !file.dir && IMAGE_EXTENSIONS.test(name))
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
    console.log('Error in parseCbzPages: ', e)
    throw e
  }
}

export function loadCbzAsObjectUrls(blobs: Blob[]): string[] {
  try {
    return blobs.map((b) => URL.createObjectURL(b))
  } catch (e) {
    console.log('Error in loadCbzAsObjectUrls: ', e)
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
