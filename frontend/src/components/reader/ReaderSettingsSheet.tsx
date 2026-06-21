import type { ReactNode } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '#/components/ui/sheet'
import { Separator } from '#/components/ui/separator'

import { useReaderStore } from '#/stores/rootStore'

interface ReaderSettingsSheetProps {
  children?: ReactNode
}

export function ReaderSettingsSheet({ children }: ReaderSettingsSheetProps) {
  const displayMode = useReaderStore((s) => s.displayMode)
  const readingMode = useReaderStore((s) => s.readingMode)
  const setDisplayMode = useReaderStore((s) => s.setDisplayMode)
  const setReadingMode = useReaderStore((s) => s.setReadingMode)

  return (
    <Sheet>
      {children}
      <SheetContent side="right" className="w-80 gap-6">
        <SheetHeader>
          <SheetTitle>Reader Settings</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4">
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Display Mode
            </h3>
            <div className="flex gap-0 -space-x-px" role="radiogroup" aria-label="Display Mode">
              <Button
                variant={displayMode === 'single' ? 'default' : 'outline'}
                className="flex-1 rounded-r-none"
                onClick={() => setDisplayMode('single')}
              >
                Single
              </Button>
              <Button
                variant={displayMode === 'double' ? 'default' : 'outline'}
                className="flex-1 rounded-l-none"
                onClick={() => setDisplayMode('double')}
              >
                Double
              </Button>
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Reading Mode
            </h3>
            <div className="flex gap-0 -space-x-px" role="radiogroup" aria-label="Reading Mode">
              <Button
                variant={readingMode === 'page' ? 'default' : 'outline'}
                className="flex-1 rounded-r-none"
                onClick={() => setReadingMode('page')}
              >
                Page
              </Button>
              <Button
                variant={readingMode === 'scroll' ? 'default' : 'outline'}
                className="flex-1 rounded-l-none"
                onClick={() => setReadingMode('scroll')}
              >
                Scroll
              </Button>
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Navigation
            </h3>
            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li className="flex justify-between">
                <span>Next Page</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
                  →
                </kbd>
              </li>
              <li className="flex justify-between">
                <span>Prev Page</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
                  ←
                </kbd>
              </li>
              <li className="flex justify-between">
                <span>Next / Space</span>
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
                  Space
                </kbd>
              </li>
            </ul>
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
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <Settings className="size-5" />
      </Button>
    </SheetTrigger>
  )
}
