import { createFileRoute, Link } from '@tanstack/react-router'
import { useMangaList } from '#/hooks/useManga'
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
import { Card, CardContent } from '#/components/ui/card'
import { BookOpenText, Plus } from 'lucide-react'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { formatDate } from '#/lib/dateTimeFormatter'

export const Route = createFileRoute('/admin/mangas/')({
  component: MangaListPage,
})

function MangaListPage() {
  const { data, isLoading, isError } = useMangaList(1, 20)

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold">
          Mangas
        </h1>
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Mangas
        </h1>
        <Button asChild>
          <Link to="/admin/mangas/new" className="no-underline">
            <Plus className="h-4 w-4" />
            Create New
          </Link>
        </Button>
      </div>

      {!data?.data.length && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenText />
            </EmptyMedia>
            <EmptyTitle>No Mangas Found</EmptyTitle>
            <EmptyDescription>
              No mangas available at the moment.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/admin/mangas/new" className="no-underline">
                <Plus className="h-4 w-4" />
                Create New
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {data && data.data.length > 0 && (
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
                      {formatDate(manga.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
