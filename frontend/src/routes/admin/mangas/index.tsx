import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fetchMangas } from '#/lib/api/mangas'
import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Card,
  CardContent,
} from '#/components/ui/card'

export const Route = createFileRoute('/admin/mangas/')({
  component: MangaListPage,
})

function MangaListPage() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mangas', page],
    queryFn: () => fetchMangas(page, limit),
  })

  if (isLoading) {
    return (
      <div>
        <h1 className="display-title text-2xl font-bold text-[var(--sea-ink)]">Mangas</h1>
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <Card className="border-red-300 bg-red-50">
        <CardContent className="p-6 text-red-700">
          Failed to load mangas. Make sure the backend is running.
        </CardContent>
      </Card>
    )
  }

  const totalPages = Math.ceil((data?.total ?? 0) / limit)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="display-title text-2xl font-bold text-[var(--sea-ink)]">
          Mangas
          <span className="ml-2 text-sm font-normal text-[var(--sea-ink-soft)]">
            ({data?.total ?? 0} total)
          </span>
        </h1>
        <Button asChild>
          <Link to="/admin/mangas/new" className="no-underline">
            + Add Manga
          </Link>
        </Button>
      </div>

      {!data?.data.length ? (
        <div className="mt-12 text-center text-[var(--sea-ink-soft)]">
          <p>No mangas yet.</p>
          <Button variant="link" asChild className="mt-2">
            <Link to="/admin/mangas/new">Create your first manga</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Authors</TableHead>
                  <TableHead>Genres</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((manga) => (
                  <TableRow key={manga.id}>
                    <TableCell className="font-medium">{manga.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {manga.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {manga.authors?.map((a) => a.name).join(', ')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {manga.genres?.map((g) => g.name).join(', ')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(manga.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
