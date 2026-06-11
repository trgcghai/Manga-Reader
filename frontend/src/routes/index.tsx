import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

export function Home() {
  return (
    <main className="page-wrap px-6 py-10 sm:py-14">
      <section className="island-shell rise-in rounded-3xl p-8 sm:p-10">
        <p className="island-kicker">Frontend scaffold</p>
        <h1 className="display-title mt-4 text-4xl font-bold tracking-tight text-(--sea-ink) sm:text-5xl">
          Welcome to Manga Reader
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-(--sea-ink-soft) sm:text-lg">
          The TanStack Start app shell is ready. Replace this placeholder with
          library browsing and reader flows next.
        </p>
      </section>
    </main>
  )
}
