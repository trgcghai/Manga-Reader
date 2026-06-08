# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains the product overview in `overview.md`. Application source code has not been scaffolded yet. When implementation begins, organize by responsibility:

- `src/` for application code.
- `src/components/` for reusable UI.
- `src/pages/` or `src/routes/` for library, manga detail, and reader views.
- `src/lib/` for file-system access, metadata parsing, and local storage helpers.
- `tests/` for unit and integration tests.
- `assets/` or `public/` for bundled static assets only. User manga files should remain outside the repo.

The expected manga library layout is documented in `overview.md`: `metadata.json`, `cover.jpg`, and chapter folders grouped by language and translator.

## Build, Test, and Development Commands

No package manager or build scripts are present yet. After scaffolding the app, document exact commands here and in `package.json`. Prefer:

- `npm install` to install dependencies.
- `npm run dev` to start the local development server.
- `npm run build` to create a production build.
- `npm test` to run the test suite.
- `npm run lint` to run static checks.

Keep runtime behavior offline and avoid cloud-service dependencies.

## Coding Style & Naming Conventions

Use domain-focused names: `Manga`, `Chapter`, `Translation`, and `Translator`. Prefer PascalCase for components/classes, camelCase for variables/functions, and kebab-case for route or asset filenames. Keep modules small and grouped by feature. Use Prettier and ESLint once a JavaScript or TypeScript stack is introduced.

## Testing Guidelines

Add tests with new behavior, especially around file discovery, metadata parsing, language/translator selection, and reader progress persistence. Name tests after the behavior under test, for example `metadata-parser.test.ts` or `reader-progress.test.ts`. Use small fixture folders to represent manga libraries; do not rely on personal local paths.

## Commit & Pull Request Guidelines

This directory is not currently a Git repository, so no project-specific commit history exists. Use concise imperative commit messages such as `Add reader progress persistence`. Pull requests should include a short description, testing notes, linked issues when applicable, and screenshots for UI changes.

## Security & Configuration Tips

This project is local-only. Do not add authentication, telemetry, cloud sync, or external API dependencies unless the project goals change. Treat local file paths as user-controlled input, validate paths before reading, and avoid writing into manga library folders except for documented metadata updates.
