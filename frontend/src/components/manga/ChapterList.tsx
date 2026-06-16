// import type { ChapterDetail } from '#/services/api/mangaApi'
// import {
//   Empty,
//   EmptyHeader,
//   EmptyMedia,
//   EmptyTitle,
// } from '#/components/ui/empty'
// import { BookOpen } from 'lucide-react'

// interface ChapterListProps {
//   chapters: ChapterDetail[]
// }

// export function ChapterList({ chapters }: ChapterListProps) {
//   if (chapters.length === 0) {
//     return (
//       <Empty>
//         <EmptyHeader>
//           <EmptyMedia variant="icon">
//             <BookOpen />
//           </EmptyMedia>
//           <EmptyTitle>No chapters yet</EmptyTitle>
//         </EmptyHeader>
//       </Empty>
//     )
//   }

//   return (
//     <div>
//       <h2 className="mb-4 text-xl font-semibold">Chapters</h2>
//       <div className="space-y-2">
//         {chapters.map((chapter) => (
//           <div
//             key={chapter.id}
//             className="flex gap-4 rounded-lg border p-4"
//           >
//             <span className="mt-0.5 shrink-0 font-mono text-sm text-muted-foreground">
//               #{chapter.number}
//             </span>
//             <div className="min-w-0 flex-1">
//               {chapter.title && (
//                 <p className="truncate font-medium">{chapter.title}</p>
//               )}
//               {chapter.translations.length > 0 && (
//                 <div className="mt-1 space-y-0.5">
//                   {chapter.translations.map((tr) => (
//                     <p
//                       key={tr.id}
//                       className="truncate text-sm text-muted-foreground"
//                     >
//                       {tr.language.name} by {tr.translator.name}
//                     </p>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   )
// }

import type { ChapterDetail } from '#/services/api/mangaApi'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { BookOpen } from 'lucide-react'
import { formatDistanceToNow } from '#/lib/dateTimeFormatter'

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
              <div key={tr.id} className="flex items-center justify-between gap-2 py-1 px-2 rounded-lg cursor-pointer hover:bg-muted">
                <p className="text-base text-muted-foreground">
                  Chapter {chapter.number} | {tr.language.name}
                </p>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(tr.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
