import type { MangaResponse } from '#/services/api/mangaApi'
import { Badge } from '#/components/ui/badge'
import { BookOpen } from 'lucide-react'

interface MangaCardProps {
  manga: MangaResponse
}

const statusStyle = (status: string) => {
  switch (status) {
    case 'ongoing':
      return 'bg-sky-600 hover:bg-sky-600 text-white'
    case 'completed':
      return 'bg-emerald-600 hover:bg-emerald-600 text-white'
    default:
      return ''
  }
}

export function MangaCard({ manga }: MangaCardProps) {
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      {manga.coverPath ? (
        <img
          src={manga.coverPath}
          alt={manga.title}
          className="absolute inset-0 size-full object-cover transition-all duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <BookOpen className="size-12 text-muted-foreground/50" aria-hidden="true" />
        </div>
      )}

      {manga.coverPath && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      )}

      {!manga.coverPath && (
        <div className="absolute bottom-0 left-0 right-0 space-y-1.5 p-4">
          <h3 className="font-serif text-base font-semibold leading-tight line-clamp-2 text-foreground">
            {manga.title}
          </h3>
          <p className="truncate text-sm text-muted-foreground">
            {manga.authors.map((a) => a.name).join(', ')}
          </p>
        </div>
      )}

      <Badge className={['absolute left-3 top-3 capitalize', statusStyle(manga.status)].filter(Boolean).join(' ')}>
        {manga.status === 'ongoing' ? 'Ongoing' : manga.status === 'completed' ? 'Completed' : manga.status}
      </Badge>

      {manga.coverPath && (
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-serif text-base font-semibold leading-tight text-white line-clamp-2 drop-shadow-sm">
            {manga.title}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            {manga.genres && manga.genres.length > 0 && (
              <span className="inline-flex items-center rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                {manga.genres[0].name}
              </span>
            )}
            <span className="truncate text-xs text-white/80">
              {manga.authors.map((a) => a.name).join(', ')}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
