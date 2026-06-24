import { describe, it, expect } from 'vitest'
import { parseChapterInfoFromFilename } from './parseChapterInfo'

describe('parseChapterInfoFromFilename', () => {
  it('extracts number from "chapter 1.cbz"', () => {
    expect(parseChapterInfoFromFilename('chapter 1.cbz')).toEqual({
      chapterNumber: 1,
      title: null,
    })
  })

  it('extracts number and title from "chapter 001 - The Beginning.zip"', () => {
    expect(
      parseChapterInfoFromFilename('chapter 001 - The Beginning.zip'),
    ).toEqual({ chapterNumber: 1, title: 'The Beginning' })
  })

  it('extracts title with multiple words', () => {
    expect(
      parseChapterInfoFromFilename('ch 12 - A New Chapter.zip'),
    ).toEqual({ chapterNumber: 12, title: 'A New Chapter' })
  })

  it('returns null title when no separator present', () => {
    expect(parseChapterInfoFromFilename('chapter05.zip')).toEqual({
      chapterNumber: 5,
      title: null,
    })
  })

  it('trims surrounding whitespace from title', () => {
    expect(
      parseChapterInfoFromFilename('chapter 1 -   Extra Spaces  .zip'),
    ).toEqual({ chapterNumber: 1, title: 'Extra Spaces' })
  })

  it('returns null for non-chapter filenames', () => {
    expect(parseChapterInfoFromFilename('readme.txt')).toEqual({
      chapterNumber: null,
      title: null,
    })
  })

  it('extracts number from "c002.zip" stripping leading zeros', () => {
    expect(parseChapterInfoFromFilename('c002.zip')).toEqual({
      chapterNumber: 2,
      title: null,
    })
  })

  it('extracts decimal number from "c200.4.cbz"', () => {
    expect(parseChapterInfoFromFilename('c200.4.cbz')).toEqual({
      chapterNumber: 200.4,
      title: null,
    })
  })

  it('extracts decimal number from "chapter 100.1.zip"', () => {
    expect(parseChapterInfoFromFilename('chapter 100.1.zip')).toEqual({
      chapterNumber: 100.1,
      title: null,
    })
  })

  it('is case-insensitive ("ChApTeR 5.cbz")', () => {
    expect(parseChapterInfoFromFilename('ChApTeR 5.cbz')).toEqual({
      chapterNumber: 5,
      title: null,
    })
  })

  it('catches leading number without prefix ("03-scan.cbz")', () => {
    expect(parseChapterInfoFromFilename('03-scan.cbz')).toEqual({
      chapterNumber: 3,
      title: 'scan',
    })
  })

  it('returns null for filename with no number ("chapter.cbz")', () => {
    expect(parseChapterInfoFromFilename('chapter.cbz')).toEqual({
      chapterNumber: null,
      title: null,
    })
  })

  it('accepts custom pattern override', () => {
    const custom = /ep(\d+)(?:\s*-\s*(.+))?$/i
    expect(parseChapterInfoFromFilename('ep05.cbz', custom)).toEqual({
      chapterNumber: 5,
      title: null,
    })
    expect(parseChapterInfoFromFilename('chapter 1.cbz', custom)).toEqual({
      chapterNumber: null,
      title: null,
    })
  })

  it('handles "chapter - No Number.zip"', () => {
    expect(parseChapterInfoFromFilename('chapter - No Number.zip')).toEqual({
      chapterNumber: null,
      title: null,
    })
  })
})
