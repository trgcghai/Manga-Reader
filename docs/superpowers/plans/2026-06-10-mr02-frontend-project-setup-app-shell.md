# MR02 Frontend Project Setup & App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the existing TanStack Start frontend scaffold, make the home route render a minimal placeholder shell, and verify the documented dev/lint/format/build/Docker flows work on port 3000.

**Architecture:** Preserve the current TanStack Start routing model and keep the app intentionally sparse. The root document stays in `__root.tsx`, the home placeholder stays in `index.tsx`, and the existing Tailwind v4 stylesheet continues to provide the shared shell tokens and utility classes. No new feature components or route branches are needed for this MR.

**Tech Stack:** TanStack Start, TanStack Router, React 19, TypeScript 6, Tailwind CSS v4, Vite, ESLint 9, Prettier 3, Docker/Node 22.

---

## File structure

- `frontend/src/routes/__root.tsx` — HTML document shell and root metadata.
- `frontend/src/routes/index.tsx` — minimal home placeholder UI.
- `frontend/src/routeTree.gen.ts` — generated route tree, refreshed if TanStack route generation rewrites it.
- `frontend/src/styles.css` — existing Tailwind v4 imports and shared shell utilities; no major redesign required.
- `frontend/vite.config.ts` — dev server stays pinned to port 3000 with strict port behavior and polling.
- `frontend/Dockerfile` — buildable frontend image using the existing app entrypoint.
- `frontend/package.json` — script surface stays aligned with `dev`, `lint`, `format`, `build`, `check`, `test`, and `generate-routes`.

---

### Task 1: Refresh the minimal app shell

**Files:**
- Modify: `frontend/src/routes/__root.tsx`
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Update the route shell and placeholder copy**

Replace `frontend/src/routes/__root.tsx` with:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Manga Reader',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
```

Replace `frontend/src/routes/index.tsx` with:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

export function Home() {
  return (
    <main className='page-wrap px-6 py-10 sm:py-14'>
      <section className='island-shell rise-in rounded-3xl p-8 sm:p-10'>
        <p className='island-kicker'>Frontend scaffold</p>
        <h1 className='display-title mt-4 text-4xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl'>
          Welcome to Manga Reader
        </h1>
        <p className='mt-4 max-w-2xl text-base leading-7 text-[var(--sea-ink-soft)] sm:text-lg'>
          The TanStack Start app shell is ready. Replace this placeholder with
          library browsing and reader flows next.
        </p>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Regenerate the route tree if the router plugin rewrites it**

Run:

```powershell
npm run generate-routes
```

Expected: `frontend/src/routeTree.gen.ts` is unchanged or rewritten to match the current route files.

- [ ] **Step 3: Start the dev server and confirm the shell renders**

Run:

```powershell
npm run dev
```

Expected: Vite starts on port `3000`, and the home page shows the Manga Reader placeholder shell with Tailwind styles.

- [ ] **Step 4: Commit**

```powershell
git add frontend/src/routes/__root.tsx frontend/src/routes/index.tsx frontend/src/routeTree.gen.ts
git commit -m "feat: add minimal frontend app shell"
```

### Task 2: Verify the frontend toolchain and image build

**Files:**
- None expected

- [ ] **Step 1: Run lint**

Run:

```powershell
npm run lint
```

Expected: zero warnings or errors.

- [ ] **Step 2: Run format**

Run:

```powershell
npm run format
```

Expected: Prettier and ESLint finish without leaving any unformatted files behind.

- [ ] **Step 3: Run the production build**

Run:

```powershell
npm run build
```

Expected: Vite builds the frontend successfully.

- [ ] **Step 4: Build the Docker image**

Run:

```powershell
docker build -t frontend .
```

Expected: the image builds successfully with no Dockerfile changes required unless the build exposes a mismatch.

- [ ] **Step 5: Check the working tree**

Run:

```powershell
git status --short
```

Expected: only the intended MR02 frontend files are modified, and no generated or formatting-only files remain uncommitted unless `generate-routes` rewrote them.

