# GHCR Image Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and scan backend and frontend runtime images on pull requests and `main` pushes, then publish the exact scanned images to GHCR only after successful scans on `main`.

**Architecture:** Add one GitHub Actions workflow with a read-only build-and-scan job and a dependent publish job. The first job builds both runtime images, fails on HIGH or CRITICAL Trivy findings, and uploads a tar archive of the scanned images; the publish job runs only for a push to `main`, downloads that archive, and pushes both images with `latest` and full-SHA tags.

**Tech Stack:** GitHub Actions, Docker Buildx, Trivy, GHCR, `GITHUB_TOKEN`.

**Spec:** `docs/superpowers/specs/2026-10-22-ghcr-image-pipeline-design.md`

## Global Constraints

- Trigger on pull requests targeting `main` and pushes to `main`.
- Use `VITE_API_URL` from GitHub Actions repository variables for the frontend build; fail clearly if it is unset.
- Fail image scans on `HIGH` or `CRITICAL` vulnerabilities.
- Build and scan use `contents: read`; only the gated publish job gets `packages: write`.
- Publish `ghcr.io/trgcghai/manga-reader-backend` and `ghcr.io/trgcghai/manga-reader-frontend` with `latest` and full commit SHA tags.
- Publish the exact image artifacts that passed scanning; do not rebuild in the publish job.
- Do not commit changes unless the user explicitly asks.

## Review Focus

1. Missing `VITE_API_URL` must fail before building the frontend image with a clear message.
2. A failure to build either runtime image must prevent successful scans and block publishing.
3. HIGH or CRITICAL findings in either image must fail the scan job and block the dependent publish job.
4. Pull requests, including fork pull requests, must not log in to GHCR or publish, and must not receive package-write permission.
5. A successful `main` push must load and publish both images from the scan artifact with both required tags.

---

### Task 1: Add the build, scan, and gated publish workflow

**Files:**
- Create: `.github/workflows/container-images.yml`

**Interfaces:**
- Produces artifact `scanned-container-images` containing `images.tar` with local tags `local/manga-reader-backend:${{ github.sha }}` and `local/manga-reader-frontend:${{ github.sha }}`.
- Publish job consumes that artifact and maps the local tags to the two `ghcr.io/trgcghai/...` image names.

- [ ] **Step 1: Add workflow triggers and least-privilege job permissions**

Configure `pull_request` for base branch `main` and `push` for branch `main`. Set top-level and build job permissions to `contents: read`. Give `packages: write` only to the publish job; set its condition to `github.event_name == 'push' && github.ref == 'refs/heads/main'` and require `needs: build-and-scan`.

- [ ] **Step 2: Build both runtime targets for scanning**

In `build-and-scan`, check out source with `actions/checkout@v7.0.1` and configure Buildx with `docker/setup-buildx-action@v4.4.1`. Build `backend/Dockerfile` and `frontend/Dockerfile` with `docker/build-push-action@v7.4.0`, contexts `./backend` and `./frontend`, target `runtime`, `load: true`, and the local SHA tags defined above. Validate the frontend variable in a shell step using an `env` mapping from `${{ vars.VITE_API_URL }}` and fail with a clear message when empty. Pass the same variable as the frontend Docker build argument.

- [ ] **Step 3: Scan each local image with Trivy**

Run `aquasecurity/trivy-action@0.36.0` once per local image, with `image-ref`, `format: table`, `exit-code: '1'`, `severity: HIGH,CRITICAL`, and `vuln-type: os,library`. Leave `ignore-unfixed` false so unfixed findings at the threshold fail too. The following artifact step must run only after both scans pass.

- [ ] **Step 4: Save and upload the exact scanned images**

Run `docker save` for both local tags into `$RUNNER_TEMP/images.tar`. Upload it as artifact `scanned-container-images` with `actions/upload-artifact@v7.0.2`, `retention-days: 5`, and `compression-level: 0` because image layers are already compressed. Set `if-no-files-found: error`.

- [ ] **Step 5: Implement the main-only publish job**

After `build-and-scan` succeeds and the event condition matches a push to `main`, download the artifact with `actions/download-artifact@v8.0.2` into `$RUNNER_TEMP/scanned-images`, then run `docker load`. Authenticate to GHCR with `docker/login-action@v4.6.0`, username `${{ github.actor }}`, and password `${{ secrets.GITHUB_TOKEN }}`. Tag and push both local images as `ghcr.io/trgcghai/manga-reader-backend` and `ghcr.io/trgcghai/manga-reader-frontend`, each with `latest` and `${{ github.sha }}` tags.

- [ ] **Step 6: Validate the workflow file and local image builds**

Run `actionlint .github/workflows/container-images.yml`; expected result is no diagnostics. With Docker available and `VITE_API_URL` set, build both `runtime` targets locally using the workflow’s contexts, Dockerfiles, target, and frontend build argument; expected result is both images load successfully. Do not push during local verification.

- [ ] **Step 7: Verify event and security gates in a pull request run**

Open a pull request targeting `main` and confirm both builds and scans run, no GHCR login/publish step runs, and the build-and-scan job has no `packages: write` permission. Review the YAML to confirm Trivy uses `exit-code: '1'`, `severity: HIGH,CRITICAL`, and the publish job depends on `build-and-scan` without an always-run condition. Confirm the repository Actions variable `VITE_API_URL` is configured.

- [ ] **Step 8: Verify the publish gate on the first successful `main` push**

After a successful merge/push to `main`, confirm the publish job downloads the same run’s scanned artifact and publishes both images with `latest` and full-SHA tags. Confirm a failed build or scan marks the publish job skipped.

## Action Version Basis

The plan uses the upstream releases checked on 2026-10-22: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-buildx v4.4.1](https://github.com/docker/setup-buildx-action/releases/tag/v4.4.1), [build-push v7.4.0](https://github.com/docker/build-push-action/releases/tag/v7.4.0), [Trivy action v0.36.0](https://github.com/aquasecurity/trivy-action/releases/tag/v0.36.0), [upload-artifact v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2), [download-artifact v8.0.2](https://github.com/actions/download-artifact/releases/tag/v8.0.2), and [login-action v4.6.0](https://github.com/docker/login-action/releases/tag/v4.6.0).
