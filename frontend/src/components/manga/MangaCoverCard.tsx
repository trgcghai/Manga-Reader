import type { MangaResponse } from '#/services/api/mangaApi'
import { Badge } from '#/components/ui/badge'
import { BookOpen } from 'lucide-react'

interface MangaCoverCardProps {
  manga: MangaResponse
}

const badgeVariant = (status: string) =>
  status === 'completed'
    ? 'default'
    : status === 'ongoing'
      ? 'outline'
      : 'destructive'

export function MangaCoverCard({ manga }: MangaCoverCardProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="aspect-[3/4] overflow-hidden rounded-t-lg bg-muted">
        {manga.coverPath ? (
          <img
            src={manga.coverPath}
            alt={manga.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <BookOpen className="size-12 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="font-semibold leading-tight line-clamp-2">
          {manga.title}
        </h3>
        <p className="truncate text-sm text-muted-foreground">
          {manga.authors.map((a) => a.name).join(', ')}
        </p>
        <Badge variant={badgeVariant(manga.status)} className="capitalize">
          {manga.status}
        </Badge>
      </div>
    </div>
  )
}
