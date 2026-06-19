import { create } from 'zustand'
import type { StateCreator } from 'zustand'
import type { TranslationDetailResponse } from '#/types/translation'

export interface TranslationSlice {
  currentTranslation: TranslationDetailResponse | null
  currentChapter: {
    id: number
    number: number
    title?: string
    mangaId: number
    mangaTitle: string
  } | null
  currentPage: number
  totalPages: number
  readingMode: 'page' | 'scroll'
  displayMode: 'single' | 'double'

  setCurrentTranslation: (t: TranslationDetailResponse) => void
  setCurrentPage: (n: number) => void
  setTotalPages: (n: number) => void
  setReadingMode: (mode: 'page' | 'scroll') => void
  setDisplayMode: (mode: 'single' | 'double') => void
  nextPage: () => void
  prevPage: () => void
  reset: () => void
}

const initialState = {
  currentTranslation: null,
  currentChapter: null,
  currentPage: 0,
  totalPages: 0,
  readingMode: 'page' as const,
  displayMode: 'single' as const,
}

export const translationSlice: StateCreator<TranslationSlice, [], [], TranslationSlice> = (set, get) => ({
  ...initialState,

  setCurrentTranslation: (t) =>
    set({
      currentTranslation: t,
      currentChapter: {
        id: t.chapter.id,
        number: t.chapter.number,
        title: t.chapter.title,
        mangaId: t.chapter.manga.id,
        mangaTitle: t.chapter.manga.title,
      },
    }),

  setCurrentPage: (n) => set({ currentPage: n }),

  setTotalPages: (n) => set({ totalPages: n }),

  setReadingMode: (mode) => set({ readingMode: mode }),

  setDisplayMode: (mode) => set({ displayMode: mode }),

  nextPage: () =>
    set((state) => ({
      currentPage: Math.min(state.currentPage + 1, state.totalPages - 1),
    })),

  prevPage: () =>
    set((state) => ({
      currentPage: Math.max(state.currentPage - 1, 0),
    })),

  reset: () => set({ ...initialState }),
})

export const useReaderStore = create<TranslationSlice>()(translationSlice)
