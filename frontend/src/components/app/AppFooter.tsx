export function AppFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Manga Reader &mdash; a local manga
          library
        </p>
      </div>
    </footer>
  )
}
