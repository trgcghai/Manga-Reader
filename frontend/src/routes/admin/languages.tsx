import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useLanguageList } from '#/hooks/useLanguages'
import { Input } from '#/components/ui/input'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '#/components/ui/table'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { Card, CardContent } from '#/components/ui/card'
import { Globe } from 'lucide-react'

export const Route = createFileRoute('/admin/languages')({
  component: AdminLanguagesPage,
})

function AdminLanguagesPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useLanguageList()

  const filtered = data?.filter(
    (lang) =>
      lang.name.toLowerCase().includes(search.toLowerCase()) ||
      lang.code.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Languages</h1>
      </div>

      <div className="mt-4">
        <Input
          placeholder="Search languages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading && (
        <div className="mt-6 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Card className="mt-6 border-red-300 bg-red-50">
          <CardContent className="p-6 text-red-700">
            Failed to load languages. Make sure the backend is running.
          </CardContent>
        </Card>
      )}

      {filtered && filtered.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Globe />
            </EmptyMedia>
            <EmptyTitle>No Languages Found</EmptyTitle>
            <EmptyDescription>
              {search
                ? 'No languages match your search.'
                : 'No languages have been seeded yet.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {filtered && filtered.length > 0 && (
        <div className="mt-6">
          <Table className="border">
            <TableHeader>
              <TableRow>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Code
                </TableHead>
                <TableHead className="text-base font-semibold text-muted-foreground">
                  Name
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((lang) => (
                <TableRow key={lang.id}>
                  <TableCell className="font-mono font-medium uppercase">
                    {lang.code}
                  </TableCell>
                  <TableCell>{lang.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <p className="mt-2 text-sm text-muted-foreground">
            Showing {filtered.length} of {data?.length ?? 0} languages
          </p>
        </div>
      )}
    </div>
  )
}
