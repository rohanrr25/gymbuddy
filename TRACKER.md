# GymBuddy Tracker

Running record of what's been built, what's been decided, and what broke. Written for both of us: skim the top four sections before starting work, and check **Gotchas** before debugging anything. History lives in the **Session log** at the bottom.

> This repo is public. Never put keys, tokens, or connection strings in this file.

---

## Current state

| | |
|---|---|
| **Live** | https://gymbuddy-self-2e78.vercel.app (behind Vercel Authentication, see G5) |
| **Deploys** | Push to `main` → Production. Any other branch → preview URL. Via the Vercel GitHub integration. |
| **Repo** | https://github.com/rohanrr25/gymbuddy (public) |
| **Vercel** | project `gymbuddy`, team `self-2e78` |
| **App** | Static placeholder page only. No DB, no API, no auth, no env vars. |
| **Stack** | Next.js 16.3.5 (App Router, Turbopack) · React 19.2.8 · TypeScript 5 · Tailwind v4 · shadcn/ui 4.21 (Base UI, Nova preset, Lucide) |
| **Local tools** | Node 25.9.0 (Vercel builds on Node 24) · npm 11.12 · Vercel CLI 59.25 (logged out, see G6) · gh 2.101 |

## Next up

1. Settle the backend location (see Open decisions). This blocks step 2.
2. Provision Postgres through the Vercel Marketplace, which injects `DATABASE_URL`. Run `vercel env pull` for local dev (needs the CLI logged in).
3. Schema + basic CRUD: Exercise, Routine, Workout, Set.
4. Tap-based set-logging screen. The v1 bar: fast enough to use between sets.
5. Log real workouts for about 2 weeks before starting any AI work (v2).

## Open decisions

| Decision | Options | Recommendation | Status |
|---|---|---|---|
| Where the backend lives | Next.js server actions / separate FastAPI / separate Go | **Next.js.** One repo, one deploy, one language, and it keeps effort on the frontend, which is the stated learning goal. Go only if Go practice is the point. | Asked 2026-09-21, awaiting answer |
| PR storage | `is_pr` flag on Set **and** a derived PR table (original plan) / compute PRs from sets | **Compute from sets.** Two stored copies can drift. One query gives both the PR view and the flags. | Raised, not yet discussed |
| Deployment Protection | Keep Vercel Authentication on / turn off | **Keep on** until the app has its own auth. It's currently the only access control on real workout data. | Recommended, not confirmed |

## Decisions made

| Date | Decision | Why |
|---|---|---|
| 2026-09-21 | Hybrid interaction: tap UI for logging, chat AI only for planning | Logging happens every set and must be instant. AI adds value on weekly planning, not per-set parsing. |
| 2026-09-21 | Next.js as the app shell | It's React (already chosen), shadcn supports it best, and it deploys to Vercel with zero config. |
| 2026-09-21 | shadcn base = **Base UI** (not Radix), preset **Nova** | Base UI is shadcn's current recommended default. Nova uses Geist + Lucide, matching the Next scaffold. Swappable later. |
| 2026-09-21 | Push-to-deploy via the Vercel GitHub integration | User asked for it. Set up in the Vercel dashboard, not the CLI. |
| 2026-09-21 | Repo is public | User created it that way. Consequence: secrets only ever go in Vercel env vars. |

---

## Gotchas & fixes

Problems that took more than one attempt. Check here before debugging.

### G1 — `shadcn init --yes` still prompts
- **Symptom:** hangs on "Select a component library", then "Which preset".
- **Cause:** `--yes` only skips the final confirm, not the choices.
- **Fix:** `npx shadcn@latest init --base base --preset nova --yes --no-monorepo`. Preset names are bare (`nova`), even though `components.json` records the style as `base-nova`. Passing `--preset base-nova` errors.

### G2 — shadcn's CSS and the Next scaffold disagree on the font variable
- **Symptom:** none visible. `font-sans` silently resolved to nothing.
- **Cause:** shadcn's `globals.css` uses `--font-sans`. create-next-app's `layout.tsx` defined `--font-geist-sans`.
- **Fix:** `app/layout.tsx` sets Geist's `variable: "--font-sans"`. Re-check this if shadcn init is ever re-run.

### G3 — `git push` fails right after `gh auth login`
- **Symptom:** `Invalid username or token. Password authentication is not supported for Git operations.`
- **Cause:** the device-flow login didn't register gh as git's credential helper.
- **Fix:** `gh auth setup-git` (now set globally).

### G4 — `gymbuddy.vercel.app` is not ours
- It returns 200, but it's someone else's project. Ours is `gymbuddy-self-2e78.vercel.app`.

### G5 — curl gets "Log in to Vercel" or a 302 to `vercel.com/sso-api`
- **Not a broken deploy.** Vercel Authentication is on, so anonymous requests get the login wall.
- **To verify a deploy without a browser:** `gh api repos/rohanrr25/gymbuddy/deployments`, then `/deployments/<id>/statuses` → look for `state: success`. For authenticated fetches see the `vercel:access-protected-vercel-deployment` skill, or `vercel curl` once the CLI is logged in.

### G6 — Vercel CLI still logged out after the dashboard setup
- The integration was set up in the browser, so `vercel whoami` says logged out and there's no `.vercel/` link locally.
- Needed before `vercel env pull` / `vercel env add`: run `vercel login`, then `vercel link` (choose the existing `gymbuddy` project, don't create a new one).

### G7 — Next.js 16 differs from training data
- `AGENTS.md` says to read `node_modules/next/dist/docs/` before writing Next code. Take that seriously; APIs and conventions have changed.
- `next dev` rewrites the managed block in `AGENTS.md`. It does **not** touch `CLAUDE.md` while `AGENTS.md` exists (checked in `node_modules/next/dist/server/lib/generate-agent-files.js`), so project rules go in `CLAUDE.md`.

---

## Lessons for Claude

Process mistakes to avoid repeating, not code bugs.

- **Don't hide a failure behind a pipe.** `git push … | tail || fallback` never ran the fallback because `tail` succeeded. Use `set -o pipefail`, or check the result separately.
- **Check what exists before creating it.** I planned `gh repo create --private` while the user had already made a public repo. Ask, or look first.
- **When the user is weighing an approach, discuss before running commands.** The user interrupted a `node -v` because they wanted to talk through Node vs Next first. They like to understand *why* before *what*, especially on frontend choices (frontend is their learning area; their day job is Java/Go/Python).
- **Interactive auth is the user's job.** `gh auth login` and `vercel login` need a browser. Hand them over as `!<command>` and get everything else ready around them.
- **No foreground `sleep` in this harness.** To wait for a local server: `curl --retry 15 --retry-connrefused --retry-delay 1`.
- **Record the unconfirmed as unconfirmed.** A recommendation the user hasn't answered stays in Open decisions, not Decisions made.

---

## Session log

Newest first. When this passes about 10 entries, move the oldest into `docs/tracker-archive.md` so this file stays cheap to load.

### 2026-09-21 — Session 1: empty folder → live, push-to-deploy
**Done**
- Wrote down the v1–v3 plan and the hybrid interaction model (full plan was pasted in chat; summary is in Decisions made).
- Scaffolded Next.js 16 + TypeScript + Tailwind v4, then initialized shadcn/ui (G1).
- Replaced the starter with a GymBuddy placeholder page and metadata. Fixed the font variable (G2).
- Verified: `npm run build` is clean, and `npm run start` + curl returned HTTP 200 with the page content.
- Committed `1c36a1e`. Installed gh via Homebrew and the Vercel CLI via npm.
- Pushed to the user-created public repo (G3). The user connected Vercel in the dashboard, and the GitHub deployments API shows a successful Production deploy of `1c36a1e`.
- Created this tracker and the `CLAUDE.md` rules that keep it updated.

**Problems hit:** G1, G2, G3, G4, G5, G6.

**Left open:** backend location, PR storage, and Deployment Protection (all in Open decisions). The Vercel CLI still needs `vercel login` + `vercel link`.
