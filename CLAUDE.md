# CLAUDE.md

Notes for Claude Code sessions working in this repo.

## Project

Listening Log — an audiobook retention & reflection PWA (React + TypeScript
+ Vite, no backend, `localStorage` only). See `README.md` for features and
`docs/spec.md` for the evidence-based design behind it.

- Dev branch: `claude/app-build-au42e1` (per this project's workflow —
  confirm with the user before assuming a different branch).
- Deploys to GitHub Pages via `.github/workflows/deploy-pages.yml` on every
  push to that branch. Pages is enabled (Source: GitHub Actions). Live at
  `https://wsias714.github.io/ListenMore/`.
- `vite.config.ts` sets `base` to `/ListenMore/` only when `DEPLOY_TARGET=gh-pages`
  is set (done by the workflow); other hosts serve from `/`.

## Sandboxed Claude Code on the web: known proxy limitation

This environment's outbound HTTPS proxy blocks some GitHub-related hosts
outright with a policy-level 403 — this is not a transient error and not
worth retrying or working around with curl flags:

- `api.github.com` paths not covered by the `mcp__github__*` tool surface
  (e.g. `POST /repos/{owner}/{repo}/pages` to enable Pages) return
  `403 Access to this GitHub API path is not permitted through this proxy`.
- `*.github.io` (i.e. the live Pages site itself) is blocked at the proxy's
  CONNECT layer — confirmed via `curl -sS "$HTTPS_PROXY/__agentproxy/status"`,
  which shows `connect_rejected` / `gateway answered 403` for that host.
  `WebFetch` hits the same wall (also comes back 403).

Practical implications:
- To check or change anything not exposed by an `mcp__github__*` tool (like
  enabling Pages, or other repo Settings-only actions), it has to be done
  outside this sandbox — e.g. the user running `gh` from a local/VS Code
  session, or the user going through the GitHub web UI directly
  (`github.com/<owner>/<repo>/settings/...`).
- To verify a live Pages/deploy URL actually renders, this sandbox can't do
  it directly. Rely on independent signals instead: the GitHub Actions run
  conclusion (`mcp__github__actions_list` / `actions_get`) for the commit in
  question, and a local `npm run build` / `vite preview` smoke test of the
  same code. Say plainly that the live URL itself wasn't fetched from here,
  rather than implying it was.
- Don't try to route around the block (no disabling TLS verification, no
  unsetting `HTTPS_PROXY`) — it's a deliberate policy, not a bug.

This is scoped to what this specific sandboxed environment's network policy
blocks; it may not apply in a different environment/session.
