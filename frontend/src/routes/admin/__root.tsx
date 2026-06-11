import {
  createRootRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router'

const navItems = [{ to: '/admin/mangas', label: 'Mangas' }]

export const Route = createRootRoute({
  component: AdminLayout,
})

function AdminLayout() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-(--line) bg-(--surface) p-6">
        <Link
          to="/"
          className="mb-8 block text-sm font-bold uppercase tracking-wider text-(--kicker) no-underline"
        >
          ← Back to Home
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === item.to
                  ? 'is-active bg-(--chip-bg) text-(--sea-ink)'
                  : 'text-(--sea-ink-soft)'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  )
}
