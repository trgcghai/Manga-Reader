import { describe, it, expect, vi, beforeEach } from 'vitest'
import JSZip from 'jszip'

describe('parseCbzPages', () => {
  async function createMockCbz(files: Record<string, string>): Promise<ArrayBuffer> {
    const zip = new JSZip()
    for (const [name, content] of Object.entries(files)) {
      zip.file(name, content)
    }
    return await zip.generateAsync({ type: 'arraybuffer' })
  }

  it('extracts and sorts image files by name', async () => {
    const { parseCbzPages } = await import('#/utils/cbzParser')
    const buffer = await createMockCbz({
      'page03.jpg': 'image-data-3',
      'page01.jpg': 'image-data-1',
      'page02.jpg': 'image-data-2',
      'notes.txt': 'not an image',
    })
    const result = await parseCbzPages(buffer)
    expect(result).toHaveLength(3)
    expect(result[0].type).toBe('image/jpeg')
  })

  it('filters to jpg, jpeg, png, webp only', async () => {
    const { parseCbzPages } = await import('#/utils/cbzParser')
    const buffer = await createMockCbz({
      '1.jpg': 'a',
      '2.jpeg': 'b',
      '3.png': 'c',
      '4.webp': 'd',
      '5.gif': 'e',
      '6.bmp': 'f',
      'readme.txt': 'g',
    })
    const result = await parseCbzPages(buffer)
    expect(result).toHaveLength(4)
  })

  it('sorts pages in natural numeric order', async () => {
    const { parseCbzPages } = await import('#/utils/cbzParser')
    const buffer = await createMockCbz({
      'page10.jpg': '10',
      'page2.jpg': '2',
      'page1.jpg': '1',
      'page20.jpg': '20',
    })
    const result = await parseCbzPages(buffer)
    const names = result.map(b => b.size)
    expect(names).toEqual([1, 1, 2, 2])
  })

  it('throws if no image files found', async () => {
    const { parseCbzPages } = await import('#/utils/cbzParser')
    const buffer = await createMockCbz({ 'readme.txt': 'hello' })
    await expect(parseCbzPages(buffer)).rejects.toThrow('No valid page images found in CBZ file')
  })

  it('handles empty CBZ', async () => {
    const { parseCbzPages } = await import('#/utils/cbzParser')
    const zip = new JSZip()
    const buffer = await zip.generateAsync({ type: 'arraybuffer' })
    await expect(parseCbzPages(buffer)).rejects.toThrow('No valid page images found in CBZ file')
  })
})

describe('loadCbzAsObjectUrls and revokeObjectUrls', () => {
  let createdUrls: string[] = []

  beforeEach(() => {
    createdUrls = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
      const url = `blob:mock/${createdUrls.length}`
      createdUrls.push(url)
      return url
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  it('creates object URLs for each blob', async () => {
    const { loadCbzAsObjectUrls } = await import('#/utils/cbzParser')
    const blobs = [new Blob(['a']), new Blob(['b'])]
    const urls = loadCbzAsObjectUrls(blobs)
    expect(urls).toHaveLength(2)
    expect(urls[0]).toMatch(/^blob:/)
  })

  it('revokes object URLs', async () => {
    const { revokeObjectUrls } = await import('#/utils/cbzParser')
    revokeObjectUrls(['blob:1', 'blob:2'])
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:2')
  })
})
