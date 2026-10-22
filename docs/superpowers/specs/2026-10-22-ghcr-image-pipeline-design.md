# GHCR Image Build, Scan, and Publish Design

## Goal

Add GitHub Actions CI for the backend and frontend runtime images. Pull requests targeting `main` and pushes to `main` build and scan both images. A `main` push publishes the images to GHCR only after both scans pass.

## Repository Context

- The GitHub repository is `haitruongtpma/Manga-Reader`.
- The backend and frontend each have a multi-stage Dockerfile with a `runtime` target.
- The frontend Dockerfile embeds `VITE_API_URL` at build time.
- There is no existing workflow under `.github/workflows`.

## Workflow

Create one workflow that triggers on:

- `pull_request` targeting `main`.
- `push` to `main` (including the push created by merging a pull request).

The workflow builds the backend and frontend `runtime` targets, then scans each resulting image with Trivy. Trivy findings at `HIGH` or `CRITICAL` severity fail the scan. A scanner execution error also fails the job. Findings below the selected threshold do not block publication.

Build and scan run with `contents: read` and no package-write permission. On a successful push to `main`, a separate dependent publish job downloads the exact image artifacts that passed scanning and pushes them to GHCR. This avoids rebuilding different image contents after the scan and keeps `packages: write` out of pull request jobs.

## Images and Tags

Publish these images:

- `ghcr.io/trgcghai/manga-reader-backend`
- `ghcr.io/trgcghai/manga-reader-frontend`

Each successful `main` push publishes both `latest` and the full commit SHA tags. Pull requests build and scan but do not push images.

## Frontend Build Configuration

Pass the GitHub Actions repository variable `VITE_API_URL` as the frontend Docker build argument. The workflow must fail with a clear message if the variable is unset, since a production frontend bundle with a missing API URL would not be usable.

## Permissions and Secrets

- Build and scan job: `contents: read` only.
- Publish job: `packages: write` and `contents: read`.
- Authenticate to GHCR with the automatically provided `GITHUB_TOKEN`; no personal access token is required.
- The publish job runs only for `push` events on `refs/heads/main` and only after successful scans.

## Failure Behavior

- A build failure, Trivy scanner error, or HIGH/CRITICAL finding fails the validation job.
- A failed validation job prevents the publish job from running.
- Missing `VITE_API_URL` fails the frontend build with an actionable message.
- Pull requests never publish, even when scans pass.

## Acceptance Checks

1. A pull request targeting `main` builds both runtime images and scans both with Trivy.
2. A pull request does not attempt GHCR login or publish.
3. A HIGH or CRITICAL finding in either image prevents publishing.
4. A successful push to `main` publishes both already-scanned images with `latest` and full-SHA tags.
5. The workflow requests package-write permission only in the gated publish job.
6. The frontend image receives the configured `VITE_API_URL` build argument.

## Out of Scope

- Deployment to a server or environment.
- Multi-platform image builds.
- Signing, SBOM publication, or vulnerability exceptions/allowlists.
- Changes to production Compose or environment files.
