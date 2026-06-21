import type { ReactNode } from 'react'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '#/components/ui/command'
import { ArrowLeft, ArrowRight, Settings } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { Separator } from '#/components/ui/separator'

import { ButtonGroup } from '#/components/ui/button-group'
import { useReaderStore } from '#/stores/rootStore'

interface ReaderSettingsSheetProps {
  children?: ReactNode;
  title?: string;
}

export function ReaderSettingsSheet({ children, title }: ReaderSettingsSheetProps) {
  const displayMode = useReaderStore((s) => s.displayMode)
  const readingMode = useReaderStore((s) => s.readingMode)
  const setDisplayMode = useReaderStore((s) => s.setDisplayMode)
  const setReadingMode = useReaderStore((s) => s.setReadingMode)

  return (
    <Sheet>
      {children}
      <SheetContent side="right" className="w-80 gap-6" showOverlay={false}>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground line-clamp-2">
              {title}
            </h3>
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Display Mode
            </h3>
            <ButtonGroup
              className="w-full"
              role="radiogroup"
              aria-label="Display Mode"
            >
              <Button
                variant={displayMode === 'single' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setDisplayMode('single')}
              >
                Single
              </Button>
              <Button
                variant={displayMode === 'double' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setDisplayMode('double')}
              >
                Double
              </Button>
            </ButtonGroup>
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Reading Mode
            </h3>
            <ButtonGroup
              className="w-full"
              role="radiogroup"
              aria-label="Reading Mode"
            >
              <Button
                variant={readingMode === 'page' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setReadingMode('page')}
              >
                Page
              </Button>
              <Button
                variant={readingMode === 'scroll' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setReadingMode('scroll')}
              >
                Scroll
              </Button>
            </ButtonGroup>
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Navigation
            </h3>
            <Command className="rounded-lg border-border">
              <CommandList className="max-h-none overflow-visible">
                <CommandGroup>
                  <CommandItem>
                    <span>Next Page</span>
                    <CommandShortcut className="flex items-center gap-1">
                      <ArrowRight className="size-4" />
                      <span>/ Space</span>
                    </CommandShortcut>
                  </CommandItem>
                  <CommandItem>
                    <span>Prev Page</span>
                    <CommandShortcut>
                      <ArrowLeft className="size-4" />
                    </CommandShortcut>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ReaderSettingsTrigger() {
  return (
    <SheetTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
      >
        <Settings className="size-5" />
      </Button>
    </SheetTrigger>
  )
}
