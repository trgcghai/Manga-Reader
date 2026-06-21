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

interface ReaderSettingsSheetProps {
  children?: ReactNode
}

export function ReaderSettingsSheet({ children }: ReaderSettingsSheetProps) {
  return (
    <Sheet>
      {children}
      <SheetContent
        side="right"
        className="w-80 bg-zinc-950 border-zinc-800 text-zinc-100"
      >
        <SheetHeader>
          <SheetTitle className="text-zinc-100">Reader Settings</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Display Mode
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 cursor-pointer hover:border-zinc-500 transition-colors">
                Single Page
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed opacity-60">
                Double Page
              </div>
            </div>
          </div>
          <Separator className="bg-zinc-800" />
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Scroll Mode
            </h3>
            <div className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500 cursor-not-allowed opacity-60">
              Vertical Scroll
            </div>
          </div>
          <Separator className="bg-zinc-800" />
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Navigation
            </h3>
            <ul className="space-y-1.5 text-sm text-zinc-500">
              <li className="flex justify-between">
                <span>Next Page</span>
                <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-xs">→</kbd>
              </li>
              <li className="flex justify-between">
                <span>Prev Page</span>
                <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-xs">←</kbd>
              </li>
              <li className="flex justify-between">
                <span>Next / Space</span>
                <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-xs">Space</kbd>
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
        className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 hover:bg-white/10"
      >
        <Settings className="size-5" />
      </Button>
    </SheetTrigger>
  )
}
