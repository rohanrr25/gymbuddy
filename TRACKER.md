# GymBuddy Tracker

Running record of what's been built, what's been decided, and what broke. Written for both of us: skim the top four sections before starting work, and check **Gotchas** before debugging anything. History lives in the **Session log** at the bottom.

> This repo is public. Never put keys, tokens, or connection strings in this file.

---

## Vision (user's words, 2026-09-21)

A gym buddy, not just a tracker: something that **keeps you honest and pushes you**. It tracks everything done in the gym, then uses that data to help you improve:
- **Knowing when to push you to add weight.** Based on the program and what you lifted last week, and later on health stats (e.g. you slept well).
- **Generating programs** when you want one.
- **Goal-aware.** Bulking vs cutting, how much stronger you want to get, and how fast.

**How that maps to the build (proposed, not yet confirmed):**
- The push is a **deterministic rule first** (e.g. double progression: all sets hit the top of the rep range → add weight next session). It can ship right after logging, well before any AI. AI later adjusts it (sleep, goal) and explains it. Rules stay the guardrail, so a model never picks weights unchecked.
- **Capture now, because it can't be backfilled:** a rep range per exercise, optional one-tap effort per set (easy / on target / hard), and possibly bodyweight.
- **Safe to defer:** health stats (Apple Health keeps history, so v3 can backfill) and goals (a small table, addable any time).
- "Keeps you honest" implies notifications. Web push works on iPhone for home-screen web apps.

---

## Current state

| | |
|---|---|
| **Live** | https://gymbuddy-snowy-eight.vercel.app, the primary production domain. **Public, no login** (see G5). |
| **Deploys** | Push to `main` → Production. Any other branch → preview URL. Via the Vercel GitHub integration. Verified end to end with `38c1a48`. |
| **Repo** | https://github.com/rohanrr25/gymbuddy (public) |
| **Vercel** | project `gymbuddy`, team `self-2e78` |
| **App** | Placeholder page behind sign-in. No routes or UI touch the DB yet. |
| **Auth** | Clerk (`gymbuddy-auth`, free Hobby plan, a **development** instance on `*.accounts.dev`, see G11). `proxy.ts` sends every signed-out request to Clerk's hosted sign-in page. `<ClerkProvider>` sits inside `<body>` in `app/layout.tsx`, with a `<UserButton />` header. Keys: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, set for all environments. SDK `@clerk/nextjs` v7 (Core 3). |
| **Database** | Neon Postgres 18.6 (`gymbuddy-db`, free plan, `iad1`, same region as the functions). Connection string in `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, for migrations). Set for Production, Preview, and Development; local copy in `.env.local`. Driver: `pg` (G8), SSL pinned to `verify-full` in code (G9). **Schema:** `exercises` (17 seeded), `sets`, `schema_migrations`. Migrations are plain SQL in `db/migrations/`, applied in order by `npm run db:migrate` (`scripts/migrate.mjs`, direct connection, one transaction each). **Caveat:** production, preview, and local dev all share this one database, so local testing writes to real data. Fine for a one-person beta; use a Neon branch for dev before others join. |
| **Stack** | Next.js 16.3.5 (App Router, Turbopack) · React 19.2.8 · TypeScript 5 · Tailwind v4 · shadcn/ui 4.21 (Base UI, Nova preset, Lucide) |
| **Local tools** | Node 25.9.0 (Vercel builds on Node 24) · npm 11.12 · Vercel CLI 59.25 (logged in as `rohanrr25`, linked to `self-2e78/gymbuddy`) · gh 2.101 |

## Design system

Set 2026-09-21 via the frontend-design skill. Keep new screens consistent with this; change it deliberately, not by drift.

- **Idea:** chalk and iron. The look comes from real gym equipment: color-coded bumper plates and weights stamped on iron.
- **Palette** (`app/globals.css`, as shadcn tokens): chalk `#f3f4f2` background · iron `#1c1f24` ink and primary · muted text `#5b616b` · border `#d5d8d3` · focus ring = plate blue.
- **Plate colors carry meaning, never decoration.** Muscle-group dots: Chest blue, Back green, Legs yellow, Shoulders white, Arms iron. **Plate red `#d2372b` is reserved for PRs** (feature 5).
- **Type:** Barlow (one family, from highway signage). Barlow Condensed bold (`font-display`) only for numbers and headings. `tabular-nums` on every number.
- **One bold element per screen:** on the logger it's the huge weight × reps readout. Everything else stays quiet.
- **Copy:** sentence case ("Log set"), active voice. Errors say what happened and what to do. No ALL-CAPS labels, no decorative eyebrows.
- **Touch:** 44px minimum tap targets. `touch-action: manipulation` globally (no double-tap zoom on steppers). Destructive actions happen instantly and offer **undo**, never a confirmation dialog (speed rule).
- **Light theme only** for now; shadcn's `.dark` tokens are untouched and unused.

## Features

**Rule (user, 2026-09-21): go step by step, bare essentials only.** Build one feature at a time, top to bottom. Each is done when it works on the live site, and only then does the next one start. Nothing from **Later** gets built early, not even "while we're in there."

Status: ⬜ not started · 🟡 in progress · ✅ done (with the commit)

### Now: the smallest useful beta (log workouts, safely)

| # | Feature | What "done" means | Status |
|---|---|---|---|
| 0 | Deployable app | Live URL, push-to-deploy | ✅ `38c1a48` |
| 1 | Database | Neon Postgres provisioned, `DATABASE_URL` in the project and in `.env.local` | ✅ Neon free plan, `iad1`, Postgres 18.6, Neon Auth off. Test query passed 2026-09-21. |
| 2 | Sign in | Only signed-in users reach the app. Needed first because production is public. (Scoping data by `user_id` happens in feature 3, where the data is.) | ✅ `2a0818a`. Verified on production: a signed-out browser gets a 307 into Clerk's sign-in, and no app content is served. The user signed in on their iPhone with Google on 2026-09-21 and landed on the app. They're the first beta account. |
| 3 | Log a set | Pick an exercise, enter weight × reps, save; see today's sets. Fast, tap-based, usable on the phone. | 🟡 Built: `lib/db.ts` (pool), `lib/sets.ts` (data layer: auth check + user scoping), `app/actions.ts`, `app/page.tsx`, `app/logger.tsx`. Build and lint clean. SQL verified against the real DB with a throwaway user (idempotent retry, scoping, constraints, undo restore) and cleaned up. **Not yet verified:** the screen itself. Clerk blocks automated sign-in, so the first real test is the user logging a set on their phone. |
| 4 | Exercise history | Past sets for one exercise, newest first | ⬜ |
| 5 | PRs | Per-exercise best, computed from sets, plus manually entered PRs (the better one wins) | ⬜ |

### Next: after the beta has been used for real

| # | Feature | Note |
|---|---|---|
| 6 | Routines | A saved exercise list with a rep range per exercise |
| 7 | The push | Rule-based "add weight" suggestion (double progression) from last session. The core gym-buddy feature. |
| 8 | Effort per set | Optional one tap (easy / on target / hard). Can't be backfilled, so it's first in line after the core. |
| 9 | Home-screen install | Web app manifest + icon so it runs full-screen on the iPhone |

### Later: parked, don't build yet

Custom exercises (add your own) · editing a logged set · Goals (bulk/cut, targets, timeline) · bodyweight tracking · reminders and notifications · AI program generation and chat (v2) · Apple Health and other health data (v3) · native iPhone app · public release work (own domain, Clerk production instance (G11), signup polish, Clerk shadcn theme, privacy policy, Sign in with Apple for the App Store) · offline sync · first `/graphify` run (once there's real code)

## Open decisions

| Decision | Options | Recommendation | Status |
|---|---|---|---|
| Getting it on the iPhone | PWA (home-screen web app) / Capacitor wrapper / Expo (React Native) / SwiftUI | **PWA now**: a mobile-first layout plus a web manifest, so it's on the phone in v1 at no extra cost. **Native when HealthKit (v3) requires it**, since HealthKit has no web API; decide between Expo and Capacitor then. | User stated the goal 2026-09-21, approach not chosen |

## Decisions made

| Date | Decision | Why |
|---|---|---|
| 2026-09-21 | Hybrid interaction: tap UI for logging, chat AI only for planning | Logging happens every set and must be instant. AI adds value on weekly planning, not per-set parsing. |
| 2026-09-21 | Next.js as the app shell | It's React (already chosen), shadcn supports it best, and it deploys to Vercel with zero config. |
| 2026-09-21 | shadcn base = **Base UI** (not Radix), preset **Nova** | Base UI is shadcn's current recommended default. Nova uses Geist + Lucide, matching the Next scaffold. Swappable later. |
| 2026-09-21 | Push-to-deploy via the Vercel GitHub integration | User asked for it. Set up in the Vercel dashboard, not the CLI. |
| 2026-09-21 | Repo is public | User created it that way. Consequence: secrets only ever go in Vercel env vars. |
| 2026-09-21 | **Backend is Next.js**, not FastAPI or Go | The user asked whether FastAPI suits AI better. It doesn't here: the roadmap *calls* Claude over HTTPS rather than running models, and the TS SDK covers that. The iPhone goal needs an API, not Python. **Rule:** data logic lives in plain TS modules (e.g. `lib/`), never inside components or server actions, so JSON route handlers can expose it to a native app later. Python can be added as a separate Vercel function if v3 needs data science. |
| 2026-09-21 | **Offline: online now, offline-ready schema** | Sets save straight to the DB and the UI updates optimistically. IDs are UUIDs the client can generate, so a local queue or sync can be added later with no migration. Full offline-first was rejected for v1: it's the biggest cost, and sync bugs corrupt the core data. |
| 2026-09-21 | **PRs: manual entries + computed from sets** | The user wants to enter a PR for one exercise directly, without logging a workout (e.g. lifts from before the app). Stored in a manual-PR table. With no manual entry, the PR is computed from logged sets. **Interpretation (not yet confirmed):** when both exist, the better one wins, so a new logged set can still beat a typed-in PR. No `is_pr` flag on Set, because a stored copy can drift from the history. |
| 2026-09-21 | **Multi-user product; the user is the first beta tester** | "It's gonna start off with just me as a beta tester and if I actually like it then I want to release it." So every table gets a `user_id` from day one, and we use real auth rather than a password gate (a gate would be thrown away at release). No signup polish, onboarding, or admin tools until release is real (ponytail). |
| 2026-09-21 | **Auth: Clerk** (over Neon Auth) | Least auth code of our own (prebuilt UI, so fewer security bugs), a mature path to a native iPhone app, and Sign in with Apple for the App Store. Rows store the Clerk user ID as text. Consequence: install Neon with `-m auth=false` so there aren't two auth systems. |
| 2026-09-21 | **Sign-in uses Clerk's hosted page**, no in-app sign-in routes | Bare essentials: zero sign-in UI to build or maintain, and no public routes to get wrong. Build custom pages only if the hosted page becomes a problem. Clerk's shadcn theme was skipped too (cosmetic, parked in Later). |
| 2026-09-21 | **Rule: `proxy.ts` is only the front door** | Next.js 16's docs say proxy "should not be used as a full session management or authorization solution." So every data function (server action, route handler, query) calls `await auth()` itself and scopes by `userId`. Server actions are public POST endpoints. |
| 2026-09-21 | **Weights are pounds** | The user lifts in lb. Stored as a plain number, documented as pounds. When kg users arrive (release), add a `unit` column defaulting to `'lb'`; every existing row is known to be lb, so that migration is safe. Steppers move ±5 lb. |
| 2026-09-21 | **Exercises: a ready-made list to select from** | User: "there should be a ready made list of common exercises that we can just select from." A shared, seeded list with no per-user exercises. Custom exercises parked in Later. |
| 2026-09-21 | **Exercise picker is a dropdown, not buttons** | User feedback after first use: "not happy with the ui selection… the selections to be more of a drop down menu", but "I like the pound × reps multiplier" and "the basic start is good." Replaced the wrapping chip buttons with a native `<select>` (the iOS wheel picker), grouped by muscle via `<optgroup>`, with the plate-color dot on the closed box. Native beats a custom popup here: fastest one-thumb use and accessible for free. **Keep the weight × reps readout as it is.** |
| 2026-09-21 | **How logging works** | One screen. An exercise dropdown (muscle-grouped); weight/reps pre-filled from your last set of that exercise (so usually one tap to log); ±5 lb / ±1 rep steppers, plus typing. Optimistic: the set appears instantly and is dimmed until saved. On failure, a Retry resends the *same* id. "Today" is filtered on the phone (its timezone) from the last 36 h of sets. Delete is instant with **Undo**, which restores the same id and original time; Undo appears only after the delete lands, to avoid a race. |
| 2026-09-21 | **web-design-guidelines review of the logger: what was fixed and what was left** | Fixed: instant delete → undo; iOS double-tap zoom (`touch-action`); `transition-all` in the shadcn Button → explicit properties; missing h1; input `name`/`autocomplete`; curly apostrophe; a hint for why "Log set" is disabled; `translate="no"` on the brand. **Deliberately left:** Title Case buttons (conflicts with frontend-design's sentence case, which we chose); URL-synced state and a skip link (one screen, no value); "…" placeholders (the `0` is a value hint). |
| 2026-09-21 | Design skills: **frontend-design** (Anthropic) + **web-design-guidelines** (Vercel) | The user asked for the front end "as pretty as possible while still being simple to use." One skill covers each half. Both were read before installing and are instructions only; web-design-guidelines fetches Vercel's latest rule list when it runs. **Searched and skipped:** a duplicate of the react-best-practices skill we already have, plus clean-code and TypeScript-expert skills from unknown authors that overlap ponytail. **Candidate for later:** `ponytail-review` (per-change over-engineering review). |
| 2026-09-21 | Project skills: **ponytail** and **graphify** | User asked for them. Installed in project scope (`.claude/skills/`, pinned in `skills-lock.json`) so ponytail's always-on mode doesn't affect other projects. Checked before installing: both repos are well established (MIT / Apache-2.0), and graphify's PyPI package really is named `graphifyy` (from its own `pyproject.toml`), not a lookalike. |

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
- It returns 200, but it's someone else's project. Ours is `gymbuddy-snowy-eight.vercel.app` (primary). `gymbuddy-self-2e78.vercel.app` and `gymbuddy-git-main-self-2e78.vercel.app` alias the same production deployment.

### G5 — Some of our URLs show a Vercel login wall and some don't
- **Symptom:** `gymbuddy-self-2e78.vercel.app` and per-deploy URLs return a 302 to `vercel.com/sso-api` ("Log in to Vercel"). `gymbuddy-snowy-eight.vercel.app` returns 200 with the app.
- **Cause:** Vercel's standard Deployment Protection covers every URL **except the production domain**. The production domain is public.
- **What went wrong:** I tested only the `self-2e78` alias, saw the login wall, and concluded that production was protected. I then advised that protection was enough access control. It wasn't. Found via `vercel inspect <url>` → Aliases.
- **Rule:** to know what the public sees, test the primary production domain listed by `vercel project ls`.
- **To verify a deploy without a browser:** `gh api repos/rohanrr25/gymbuddy/deployments`, then `/deployments/<id>/statuses` → look for `state: success`. For authenticated fetches see the `vercel:access-protected-vercel-deployment` skill, or `vercel curl` once the CLI is logged in.

### G6 — Vercel CLI setup is separate from the dashboard setup
- Connecting the project in the browser doesn't log in the CLI. Fixed on 2026-09-21: `vercel login`, then `vercel link --yes --project gymbuddy --scope self-2e78` (the existing project, not a new one).
- Login printed `Your previously selected team is no longer accessible; switching to your default scope.` Harmless: the default scope is `self-2e78`, where the project lives. Check with `vercel project ls`.
- `vercel link` writes `.env.local` with a short-lived `VERCEL_OIDC_TOKEN`. It's gitignored by `.env*`. `.vercel/` is gitignored too.

### G7 — Next.js 16 differs from training data
- `AGENTS.md` says to read `node_modules/next/dist/docs/` before writing Next code. Take that seriously; APIs and conventions have changed.
- `next dev` rewrites the managed block in `AGENTS.md`. It does **not** touch `CLAUDE.md` while `AGENTS.md` exists (checked in `node_modules/next/dist/server/lib/generate-agent-files.js`), so project rules go in `CLAUDE.md`.

### G8 — Two Vercel/Neon guides disagree on the Postgres driver
- The Vercel storage skill shows `@neondatabase/serverless`. Neon's own skill (`.claude/skills/neon-postgres`) says: **on Vercel, use `pg` (node-postgres) with Fluid compute and `attachDatabasePool` from `@vercel/functions`.** Serverless/HTTP is for edge-style runtimes.
- **We use `pg`**: the provider's guidance wins. Pooled `DATABASE_URL` for the app, `DATABASE_URL_UNPOOLED` for migrations.

### G9 — `pg` SSL-mode warning
- **Symptom:** `SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'. In the next major version … these modes will adopt standard libpq semantics, which have weaker security guarantees.`
- **Meaning:** today's behavior is the strict one (`verify-full`). A future `pg` v9 would quietly loosen it.
- **To do (in the DB module, feature 3):** pin full verification in code rather than relying on the Vercel-managed URL's `sslmode`.

### G10 — Neon install needs terms accepted in the browser
- **Symptom:** `vercel integration add neon --non-interactive` returns `"reason": "integration_terms_acceptance_required"` with a `verification_uri`. Nothing is created.
- **Fix:** the user opens the URI and accepts, then re-run the same command. It also installed Neon's agent skills into `.agents/skills/` (symlinked from `.claude/skills/`) and added them to `skills-lock.json`.

### G11 — Clerk is a development instance, and that matters at release
- The install created a dev instance: `pk_test_`/`sk_test_` keys, sign-in on `charmed-pangolin-1157.accounts.dev`, and Clerk shows development-mode branding. Fine for the beta.
- **At release:** a Clerk production instance needs a domain we own; `*.vercel.app` won't do. Verify against Clerk's docs then. Parked under Later → public release work.
- Clerk's install also added 6 agent skills in `.agents/skills/clerk-*`. Only `clerk-setup` and `clerk-nextjs-patterns` are relevant now.

### G12 — Signed-out curl to production returns 404, not a redirect
- **Symptom:** `curl https://gymbuddy-snowy-eight.vercel.app/` → `HTTP/2 404`, `x-clerk-auth-status: signed-out`. Looks like sign-in is broken.
- **Cause:** by design, `auth.protect()` redirects only requests that look like a browser opening a page. Everything else gets a 404, so the sign-in page isn't advertised to bots.
- **To test the real flow,** send browser headers: `-H 'Accept: text/html' -H 'Sec-Fetch-Dest: document' -H 'Sec-Fetch-Mode: navigate'` → `307` to `…clerk.accounts.dev/v1/client/handshake`.
- Note: local `npm run start` did redirect a plain curl. Don't use local behavior to predict this.

---

## Lessons for Claude

Process mistakes to avoid repeating, not code bugs.

- **Don't hide a failure behind a pipe.** `git push … | tail || fallback` never ran the fallback because `tail` succeeded. Use `set -o pipefail`, or check the result separately.
- **Check what exists before creating it.** I planned `gh repo create --private` while the user had already made a public repo. Ask, or look first.
- **When the user is weighing an approach, discuss before running commands.** The user interrupted a `node -v` because they wanted to talk through Node vs Next first. They like to understand *why* before *what*, especially on frontend choices (frontend is their learning area; their day job is Java/Go/Python).
- **Interactive auth is the user's job.** `gh auth login` and `vercel login` need a browser. Hand them over as `!<command>` and get everything else ready around them.
- **No foreground `sleep` in this harness.** To wait for a local server: `curl --retry 15 --retry-connrefused --retry-delay 1`.
- **Don't generalize from one URL.** I saw a login wall on one alias and told the user production was protected, then built security advice on that. Verify the claim that matters (what the *public* can reach) directly before advising on it.
- **`set -o pipefail` + a `grep` filter reports grep's exit code.** A clean `npm run lint | grep …` printed `exit: 1` because grep matched nothing. Check the tool's own exit code separately before calling something a failure.
- **Verify short-named packages before trusting them.** shadcn's setup added a dependency literally called `cn`. It turned out legitimate (maintainer `shadcn`, repo `shadcn-ui/cn`, a tailwind-merge replacement), but checking was right: short generic names are prime squatting targets.
- **Quote URLs containing `?` in zsh.** `gh api repos/x/y/git/trees/HEAD?recursive=1` failed with `no matches found` because zsh treats an unquoted `?` as a glob.
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
- Created this tracker and the `CLAUDE.md` rules that keep it updated. Pushed as `38c1a48`, which auto-deployed to Production: the first push-triggered deploy, so the loop is confirmed.

**Problems hit:** G1, G2, G3, G4, G5, G6.

**Left open:** backend location, PR storage, and Deployment Protection (all in Open decisions). The Vercel CLI still needs `vercel login` + `vercel link`.
