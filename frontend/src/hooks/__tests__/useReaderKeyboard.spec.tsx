import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useReaderKeyboard } from '../useReaderKeyboard'

function dispatchKey(key: string) {
  const target = document.activeElement || document.body
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('useReaderKeyboard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls onPrevPage when ArrowLeft is pressed', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))
    dispatchKey('ArrowLeft')
    expect(onPrevPage).toHaveBeenCalledTimes(1)
    expect(onNextPage).not.toHaveBeenCalled()
  })

  it('calls onNextPage when ArrowRight is pressed', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))
    dispatchKey('ArrowRight')
    expect(onNextPage).toHaveBeenCalledTimes(1)
    expect(onPrevPage).not.toHaveBeenCalled()
  })

  it('calls onNextPage when Space is pressed', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))
    dispatchKey(' ')
    expect(onNextPage).toHaveBeenCalledTimes(1)
    expect(onPrevPage).not.toHaveBeenCalled()
  })

  it('does not call callbacks when enabled is false', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: false }))
    dispatchKey('ArrowLeft')
    dispatchKey('ArrowRight')
    dispatchKey(' ')
    expect(onPrevPage).not.toHaveBeenCalled()
    expect(onNextPage).not.toHaveBeenCalled()
  })

  it('suppresses keyboard events when focus is in an INPUT element', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    dispatchKey('ArrowLeft')
    expect(onPrevPage).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('suppresses keyboard events when focus is in a TEXTAREA element', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    textarea.focus()
    dispatchKey('ArrowRight')
    expect(onNextPage).not.toHaveBeenCalled()
    document.body.removeChild(textarea)
  })

  it('suppresses keyboard events when focus is in a contenteditable element', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))
    const div = document.createElement('div')
    div.contentEditable = 'true'
    document.body.appendChild(div)
    div.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(onNextPage).not.toHaveBeenCalled()
    document.body.removeChild(div)
  })

  it('removes event listener on unmount', () => {
    const onNextPage = vi.fn()
    const onPrevPage = vi.fn()
    const { unmount } = renderHook(() => useReaderKeyboard({ onNextPage, onPrevPage, enabled: true }))
    unmount()
    dispatchKey('ArrowRight')
    expect(onNextPage).not.toHaveBeenCalled()
  })
})
