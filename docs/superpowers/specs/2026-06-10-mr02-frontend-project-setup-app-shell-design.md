# MR02 Frontend Project Setup & App Shell Design

## Context

The frontend already exists as a TanStack Start scaffold. MR02 should align the current project with the documented frontend setup requirements: keep the app shell minimal, make the home route render a placeholder, keep Tailwind v4 wired in, and ensure the dev/build/Docker flows work on port 3000.

## Goals

- Keep the current TanStack Start scaffold.
- Keep the app shell minimal and starter-like.
- Render a placeholder home page at `/`.
- Keep Tailwind CSS v4 integrated through the existing stylesheet pipeline.
- Keep the frontend dev server on port 3000.
- Preserve documented scripts for dev, lint, format, build, and Docker image creation.

## Non-goals

- No branded redesign.
- No auth, data fetching, or backend integration.
- No extra route tree beyond the shell and home route.
- No additional component library or UI framework.

## Proposed structure

### Root shell

`frontend/src/routes/__root.tsx` remains the document shell for the app. It should continue to define the HTML document, load the shared stylesheet, and provide the root metadata. The shell stays intentionally sparse so the app can grow from a clean base.

### Home route

`frontend/src/routes/index.tsx` renders a simple placeholder page that confirms routing and styling are working. The page should be minimal rather than product-like: enough content to show the layout and Tailwind styles, but not a full landing page.

### Styling

`frontend/src/styles.css` remains the central place for Tailwind v4 imports and shared shell utilities. Existing global theme tokens can stay, but the spec does not require additional design system work. The main requirement is that the home route and document shell render consistently with the Tailwind pipeline enabled.

### Router and build wiring

`frontend/src/router.tsx` and `frontend/src/routeTree.gen.ts` stay as the TanStack route wiring layer. `vite.config.ts` should keep the dev server bound to port 3000 with strict port behavior and polling enabled for local container workflows.

### Docker and scripts

The frontend Dockerfile should keep producing a buildable image for the app. `frontend/package.json` should continue to expose the documented scripts:

- `dev`
- `build`
- `lint`
- `format`
- `check`
- `test`
- `generate-routes`

## Error handling

- Missing or conflicting port configuration should fail visibly instead of silently changing the port.
- Route shell and home route should stay deterministic and render without runtime data dependencies.
- The Docker image should build from the same app entrypoint used by local development.

## Testing and verification

- Run `npm run dev` and confirm the home page loads on port 3000.
- Run `npm run lint`.
- Run `npm run format`.
- Run `npm run build`.
- Run `docker build -t frontend .`.

## Acceptance mapping

- `npm run dev` starts without errors: covered by the Vite dev server config and the shell route.
- Home page renders with basic layout and Tailwind styles: covered by `__root.tsx`, `index.tsx`, and `styles.css`.
- `npm run lint` and `npm run format` pass: covered by the existing ESLint/Prettier setup and script alignment.
- `docker build -t frontend .` succeeds: covered by the frontend Dockerfile.
- `frontend/package.json` scripts work as documented: no extra setup is required beyond preserving the existing script surface.
