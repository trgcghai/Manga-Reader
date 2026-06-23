import type { MangaDetailResponse } from '#/services/api/mangaApi'
import { Badge } from '#/components/ui/badge'
import { BookOpen, Info, Tags, UserRoundPen } from 'lucide-react'
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
            className="aspect-3/4 w-full rounded-xl object-cover border"
          />
        ) : (
          <div className="flex aspect-3/4 w-full items-center justify-center rounded-xl bg-muted">
            <BookOpen
              className="size-16 text-muted-foreground/50"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      <div className="flex-1 space-y-4">
        <div className="flex items-start gap-3">
          <h1 className="text-3xl font-bold leading-tight text-gray-800">
            {manga.title}
          </h1>
        </div>

        {manga.authors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-sm text-muted-foreground">
              <UserRoundPen className="size-5 inline-block" />
            </span>
            {manga.authors.map((a) => (
              <Badge key={a.id} variant="secondary">
                {a.name}
              </Badge>
            ))}
          </div>
        )}

        {manga.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <span className="text-sm text-muted-foreground">
              <Tags className="size-5 inline-block" />
            </span>
            {manga.genres.map((g) => (
              <Badge key={g.id} variant="secondary">
                {g.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <span className="text-sm text-muted-foreground">
            <Info className="size-5 inline-block" />
          </span>
          <p>
            <Badge
              variant={getStatusVariant(manga.status)}
              className="capitalize"
            >
              {manga.status}
            </Badge>
          </p>
        </div>

        {manga.description && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Description:</span>{' '}
            <p className="text-sm leading-relaxed text-muted-foreground">
              {manga.description}
            </p>
          </div>
        )}

        {manga.alternativeTitles.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Also known as:</span>{' '}
            <p className="text-sm leading-relaxed text-muted-foreground">
              {manga.alternativeTitles.join(', ')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
