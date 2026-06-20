import type { ChapterDetail } from '#/services/api/mangaApi'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { BookOpen } from 'lucide-react'
import { formatDistanceToNow } from '#/lib/dateTimeFormatter'
import { Link } from '@tanstack/react-router'

interface ChapterListProps {
  chapters: ChapterDetail[]
}

export function ChapterList({ chapters }: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen />
          </EmptyMedia>
          <EmptyTitle>No chapters yet</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="space-y-3">
      {chapters.map((chapter) => (
        <div
          key={chapter.id}
          className="rounded-xl border bg-muted/40 px-4 py-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              CH. {chapter.number} {chapter.title && ` | ${chapter.title}`}
            </span>
          </div>

          <div className="mt-2 space-y-2 -mx-2">
            {chapter.translations.map((tr) => (
              <Link
                to={`/reader/$translationId`}
                params={{ translationId: tr.id.toString() }}
                key={tr.id}
              >
                <div
                  key={tr.id}
                  className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg cursor-pointer hover:bg-muted"
                >
                  <p className="text-base text-muted-foreground">
                    Chapter {chapter.number} | {tr.language.name}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(tr.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
