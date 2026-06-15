import type { MangaResponse } from '#/services/api/mangaApi'
import { Badge } from '#/components/ui/badge'
import { BookOpen } from 'lucide-react'

interface MangaCardProps {
  manga: MangaResponse
}

const badgeVariant = (status: string) =>
  status === 'completed'
    ? 'default'
    : status === 'ongoing'
      ? 'outline'
      : 'destructive'

export function MangaCard({ manga }: MangaCardProps) {
  return (
    <div className="group rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
      <div className="relative aspect-[3/4] overflow-hidden rounded-t-xl bg-muted">
        {manga.coverPath ? (
          <img
            src={manga.coverPath}
            alt={manga.title}
            className="size-full object-cover transition-all duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <BookOpen className="size-12 text-muted-foreground/50" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-base font-semibold leading-tight line-clamp-2">
            {manga.title}
          </h3>
          <Badge variant={badgeVariant(manga.status)} className="shrink-0 capitalize">
            {manga.status}
          </Badge>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {manga.authors.map((a) => a.name).join(', ')}
        </p>
      </div>
    </div>
  )
}
