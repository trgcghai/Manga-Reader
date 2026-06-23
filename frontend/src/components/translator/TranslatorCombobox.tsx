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
import { useTranslatorList } from '#/hooks/useTranslators'
import { cn } from '#/lib/utils'

interface TranslatorComboboxProps {
  value: number
  onChange: (id: number) => void
  invalid?: boolean
  id?: string
  placeholder?: string
}

export function TranslatorCombobox({
  value,
  onChange,
  invalid,
  id,
  placeholder = 'Select translator...',
}: TranslatorComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedName, setSelectedName] = useState<string | undefined>()

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useTranslatorList(1, 50, search || undefined)

  useEffect(() => {
    if (value === 0) {
      setSelectedName(undefined)
    }
  }, [value])

  const handleSelect = useCallback(
    (id: number, name: string) => {
      setSelectedName(name)
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
            !selectedName && 'text-muted-foreground',
          )}
        >
          {selectedName || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search translator..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6" role="status">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {isError && (
              <div className="flex flex-col items-center gap-2 py-6 text-sm">
                <span className="text-muted-foreground">
                  Failed to load translators.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
              </div>
            )}
            {!isLoading && !isError && data && data.data.length === 0 && (
              <CommandEmpty>No translators found.</CommandEmpty>
            )}
            {!isLoading && !isError && data && data.data.length > 0 && (
              <CommandGroup>
                {data.data.map((tr) => (
                  <CommandItem
                    key={tr.id}
                    value={String(tr.id)}
                    onSelect={() => handleSelect(tr.id, tr.name)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === tr.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {tr.name}
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
