export class AuthorRef {
  id: number
  name: string
}

export class GenreRef {
  id: number
  name: string
}

export class MangaResponse {
  id: number
  title: string
  alternativeTitles?: string[]
  description?: string
  coverPath?: string
  status: string
  authors: AuthorRef[]
  genres: GenreRef[]
  createdAt: string
  updatedAt: string
}

export class ChapterTranslationResponse {
  id: number
  folderPath: string
  note?: string
  language: { id: number; code: string; name: string }
  translator: { id: number; name: string }
}

export class ChapterDetailResponse {
  id: number
  number: number
  title?: string
  releaseDate?: string
  note?: string
  translations: ChapterTranslationResponse[]
}

export class MangaDetailResponse extends MangaResponse {
  chapters: ChapterDetailResponse[]
}
