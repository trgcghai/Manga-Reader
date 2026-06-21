import type { MangaResponse } from '#/services/api/mangaApi'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardTitle } from '#/components/ui/card'
import { BookOpen } from 'lucide-react'
import { getStatusVariant } from '#/lib/mangaUtils'

interface MangaCardProps {
  manga: MangaResponse
}

export function MangaCard({ manga }: MangaCardProps) {
  const statusVariant = getStatusVariant(manga.status)

  return (
    <Card className="group overflow-hidden gap-0 py-0 transition-all duration-300 shadow-xs hover:shadow-sm hover:-translate-y-0.5">
      <div className="relative aspect-3/4 overflow-hidden bg-muted">
        {manga.coverPath ? (
          <img
            src={manga.coverPath}
            alt={manga.title}
            className="size-full object-cover transition-all duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <BookOpen
              className="size-12 text-muted-foreground/50"
              aria-hidden="true"
            />
          </div>
        )}

        {manga.coverPath && (
          <div className="absolute inset-0 bg-linear-to-t from-black/50 via-black/20 to-transparent" />
        )}

        <Badge
          variant={statusVariant}
          className="absolute left-3 top-3 capitalize"
        >
          {manga.status}
        </Badge>

        <div className="absolute left-3 bottom-3 flex flex-wrap gap-1">
          {manga.genres.length &&
            manga.genres.slice(0, 3).map((g) => <Badge>{g.name}</Badge>)}
        </div>
      </div>

      <CardContent className="space-y-1 px-3 py-3">
        <CardTitle className="text-sm line-clamp-2 font-medium text-gray-700 text-wrap">
          {manga.title}
        </CardTitle>
      </CardContent>
    </Card>
  )
}
