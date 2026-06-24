import { describe, it, expect } from 'vitest'
import { parseChapterNumberFromFilename } from './parseChapterNumber'

describe('parseChapterNumberFromFilename', () => {
  it('extracts number from "chapter 1.cbz"', () => {
    expect(parseChapterNumberFromFilename('chapter 1.cbz')).toBe(1)
  })

  it('extracts number from "c002.zip" stripping leading zeros', () => {
    expect(parseChapterNumberFromFilename('c002.zip')).toBe(2)
  })

  it('extracts decimal number from "c200.4.cbz"', () => {
    expect(parseChapterNumberFromFilename('c200.4.cbz')).toBe(200.4)
  })

  it('extracts decimal number from "chapter 100.1.zip"', () => {
    expect(parseChapterNumberFromFilename('chapter 100.1.zip')).toBe(100.1)
  })

  it('is case-insensitive ("ChApTeR 5.cbz")', () => {
    expect(parseChapterNumberFromFilename('ChApTeR 5.cbz')).toBe(5)
  })

  it('catches leading number without prefix ("03-scan.cbz")', () => {
    expect(parseChapterNumberFromFilename('03-scan.cbz')).toBe(3)
  })

  it('returns null for non-chapter filenames ("readme.txt")', () => {
    expect(parseChapterNumberFromFilename('readme.txt')).toBeNull()
  })

  it('returns null for filename with no number ("chapter.cbz")', () => {
    expect(parseChapterNumberFromFilename('chapter.cbz')).toBeNull()
  })

  it('accepts custom pattern override', () => {
    const custom = /ep(\d+)/i
    expect(parseChapterNumberFromFilename('ep05.cbz', custom)).toBe(5)
    expect(parseChapterNumberFromFilename('chapter 1.cbz', custom)).toBeNull()
  })
})
