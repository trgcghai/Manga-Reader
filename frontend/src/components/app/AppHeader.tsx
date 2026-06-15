import { Link } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background">
            <BookOpen className="size-5" />
          </div>
          <span className="font-serif text-lg font-semibold tracking-tight">
            Manga Reader
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            to="/admin"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  )
}
