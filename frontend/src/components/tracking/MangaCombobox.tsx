import { useState, useEffect, useCallback } from 'react'
import { Check, ChevronsUpDown, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '#/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover'
import { useMangaList } from '#/hooks/useManga'
import { cn } from '#/lib/utils'

interface MangaComboboxProps {
  value: number
  onChange: (id: number) => void
  invalid?: boolean
  id?: string
  placeholder?: string
}

export function MangaCombobox({
  value,
  onChange,
  invalid,
  id,
  placeholder = 'Search manga...',
}: MangaComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>()

  const { data, isLoading, isError, refetch } = useMangaList({
    page: 1,
    limit: 50,
    search: search || undefined,
  })

  useEffect(() => {
    if (value === 0) {
      setSelectedTitle(undefined)
    }
  }, [value])

  const handleSelect = useCallback(
    (id: number, title: string) => {
      setSelectedTitle(title)
      onChange(id)
      setOpen(false)
      setSearch('')
    },
    [onChange],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          className={cn(
            'w-full justify-between font-normal',
            !selectedTitle && 'text-muted-foreground',
          )}
        >
          {selectedTitle || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search manga..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <div
                className="flex items-center justify-center py-6"
                role="status"
              >
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {isError && (
              <div className="flex flex-col items-center gap-2 py-6 text-sm">
                <span className="text-muted-foreground">
                  Failed to load mangas.
                </span>
                <Button variant="ghost" size="sm" onClick={() => refetch()}>
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
              </div>
            )}
            {!isLoading && !isError && data && data.data.length === 0 && (
              <CommandEmpty>No mangas found.</CommandEmpty>
            )}
            {!isLoading && !isError && data && data.data.length > 0 && (
              <CommandGroup>
                {data.data.map((manga) => (
                  <CommandItem
                    key={manga.id}
                    value={String(manga.id)}
                    onSelect={() => handleSelect(manga.id, manga.title)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === manga.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {manga.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
