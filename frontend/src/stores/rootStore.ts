import type { TranslationDetailResponse } from '#/services/api/mangaApi'
import { create } from 'zustand'
import type { StateCreator } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

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
  scrollPosition: number

  setCurrentTranslation: (t: TranslationDetailResponse) => void
  setScrollPosition: (n: number) => void
  setCurrentPage: (n: number) => void
  setTotalPages: (n: number) => void
  setReadingMode: (mode: 'page' | 'scroll') => void
  setDisplayMode: (mode: 'single' | 'double') => void
  nextPage: () => void
  prevPage: () => void
  reset: () => void
}

const createStorage = () => ({
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value)
    } catch {}
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name)
    } catch {}
  },
})

const initialState = {
  currentTranslation: null,
  currentChapter: null,
  currentPage: 0,
  totalPages: 0,
  readingMode: 'page' as const,
  displayMode: 'single' as const,
  scrollPosition: 0,
}

export const translationSlice: StateCreator<
  TranslationSlice,
  [],
  [],
  TranslationSlice
> = (set) => ({
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

  setScrollPosition: (n) => set({ scrollPosition: n }),

  nextPage: () =>
    set((state) => ({
      currentPage:
        state.totalPages === 0
          ? state.currentPage
          : Math.min(
              state.currentPage + (state.displayMode === 'double' ? 2 : 1),
              state.totalPages - 1,
            ),
    })),

  prevPage: () =>
    set((state) => ({
      currentPage: Math.max(
        state.currentPage - (state.displayMode === 'double' ? 2 : 1),
        0,
      ),
    })),

  reset: () => set({ ...initialState }),
})

export const useReaderStore = create<TranslationSlice>()(
  persist(translationSlice, {
    name: 'manga-reader-store',
    version: 1,
    storage: createJSONStorage(() => createStorage()),
    partialize: (state) => ({
      currentTranslation: state.currentTranslation,
      currentChapter: state.currentChapter,
      currentPage: state.currentPage,
      totalPages: state.totalPages,
      readingMode: state.readingMode,
      displayMode: state.displayMode,
      scrollPosition: state.scrollPosition,
    }),
  }),
)
