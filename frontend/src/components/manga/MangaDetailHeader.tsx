import type { MangaDetailResponse } from '#/services/api/mangaApi'
import { Badge } from '#/components/ui/badge'
import { BookOpen } from 'lucide-react'
import { getStatusVariant } from '#/lib/mangaUtils'

interface MangaDetailHeaderProps {
  manga: MangaDetailResponse
}

export function MangaDetailHeader({ manga }: MangaDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="shrink-0 md:w-72">
        {manga.coverPath ? (
          <img
            src={manga.coverPath}
            alt={manga.title}
            className="aspect-[3/4] w-full rounded-xl object-cover shadow-md"
          />
        ) : (
          <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-muted">
            <BookOpen className="size-16 text-muted-foreground/50" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4">
        <div className="flex items-start gap-3">
          <h1 className="font-serif text-3xl font-bold leading-tight">
            {manga.title}
          </h1>
          <Badge variant={getStatusVariant(manga.status)} className="mt-1.5 shrink-0 capitalize">
            {manga.status}
          </Badge>
        </div>

        {manga.authors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-sm text-muted-foreground">Authors:</span>
            {manga.authors.map((a) => (
              <Badge key={a.id} variant="secondary">
                {a.name}
              </Badge>
            ))}
          </div>
        )}

        {manga.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-sm text-muted-foreground">Genres:</span>
            {manga.genres.map((g) => (
              <Badge key={g.id} variant="secondary">
                {g.name}
              </Badge>
            ))}
          </div>
        )}

        {manga.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {manga.description}
          </p>
        )}

        {manga.alternativeTitles.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Also known as:</span>{' '}
            {manga.alternativeTitles.join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}
