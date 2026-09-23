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

## Direction (2026-09-22): the gym's Strava, and the road to a real app

The user asked to compare GymBuddy with Strava and to start thinking about a native app.

**What makes Strava work, and the gym equivalent**

| Strava | Why it works | Gym equivalent |
|---|---|---|
| GPS records the run | zero capture effort | Our weak spot: lifting is typed by hand. **Logging friction is the real competitor.** An Apple Watch app (log a set from the wrist) is the closest thing to "press start". |
| Segments | a comparable unit anyone can contest | A lift at a rep count ("bench for 5") is already a segment. **Bodyweight-relative** strength makes it fair across sizes. |
| Kudos / feed | cheap social reward right after the effort | A shareable session card: what you trained, volume, PRs. Friends react. |
| Clubs & challenges | belonging, a reason to return | Monthly volume or consistency challenges among friends. |
| Relative Effort | "was that hard *for me*?" | Effort per set (feature 9) + rep ranges gives this with no hardware. |

**Where gym differs, and what it costs us:** runs are GPS-verified, gym numbers are typed and trivial to inflate, so any leaderboard should be **friends-first and bodyweight-relative**, never a global ranking of raw weight. Sessions are long and interrupted, so speed beats beauty on the logging screen.

**Consequence for the plan:** social is worth real work only once logging is effortless and histories are rich. Keep it parked; keep paying down friction (a bigger exercise library, a searchable picker, the calendar, the push).

**When is this worth turning into a real app?** (the user asked; revisit at each of these)
1. **You use it without being asked** for ~4 weeks straight, and the data is complete enough that Progress and the push are genuinely useful.
2. **The web version starts costing you something real:** no alert when the rest timer ends while the phone is locked, no nudge when you skip a week, having to open Safari instead of tapping an icon. (The installed PWA, feature 13, buys back most of this for very little.)
3. **A second person wants it.** Sharing is the first thing that needs the polish, and the App Store presence, that a real app implies.
4. **A Watch app becomes the obvious next win** — logging from the wrist is the closest thing to Strava's "press start".
Until then, every feature built here is reusable: the `lib/` rules and types move to Expo unchanged.

**Road to a native app** (the user wants an app, not a website; the web app is "temporary")
- Nothing needs rewriting if the rules hold: data logic stays in `lib/` (no UI imports), auth is Clerk (it has an Expo SDK), and anything the phone needs is reachable through JSON route handlers.
- Likely path: **Expo (React Native)**, sharing TypeScript types and the `lib/` rules with this codebase; the screens get rebuilt (React Native has no DOM), which is fine because they're small.
- What only native (or an installed PWA) can do, and why it matters here: **notifications** (rest timer alerts while the phone is locked, "you haven't trained since Tuesday"), **HealthKit** (v3 sleep/recovery), **Apple Watch** (the biggest friction win), background sync.
- Cheap next step in that direction: the home-screen install (feature 10) gets an icon, full-screen, and web push on iOS, without a rewrite.

---

## Current state

| | |
|---|---|
| **Live** | https://gymbuddy-snowy-eight.vercel.app, the primary production domain. **Public, no login** (see G5). |
| **Deploys** | Push to `main` → Production. Any other branch → preview URL. Via the Vercel GitHub integration. Verified end to end with `38c1a48`. |
| **Repo** | https://github.com/rohanrr25/gymbuddy (public) |
| **Vercel** | project `gymbuddy`, team `self-2e78` |
| **App** | Behind sign-in, five bottom tabs: Home · Log · Routines · Progress · Settings (a sixth slot is reserved for Coach). Every screen under `(app)` shares one loading skeleton, which is also what makes them prefetchable. |
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
- **Dark mode** is the same idea with the roles swapped: iron surfaces (`#16181c`), chalk ink (`#e9eae7`), and **brighter plate colours** (`#5b9cff` blue, `#4cc07a` green, `#ffc93f` yellow, `#ff5a4d` red) so they stay legible on a dark surface. Class-based (`.dark`), which is what shadcn's `dark:` variant matches. Choice of System / Light / Dark lives in Settings, per phone.

## Features

**Rule (user, 2026-09-21): go step by step, bare essentials only.** Build one feature at a time, top to bottom. Each is done when it works on the live site, and only then does the next one start. Nothing from **Later** gets built early, not even "while we're in there."

Status: ⬜ not started · 🟡 in progress · ✅ done (with the commit)

### Now: the smallest useful beta (log workouts, safely)

| # | Feature | What "done" means | Status |
|---|---|---|---|
| 0 | Deployable app | Live URL, push-to-deploy | ✅ `38c1a48` |
| 1 | Database | Neon Postgres provisioned, `DATABASE_URL` in the project and in `.env.local` | ✅ Neon free plan, `iad1`, Postgres 18.6, Neon Auth off. Test query passed 2026-09-21. |
| 2 | Sign in | Only signed-in users reach the app. Needed first because production is public. (Scoping data by `user_id` happens in feature 3, where the data is.) | ✅ `2a0818a`. Verified on production: a signed-out browser gets a 307 into Clerk's sign-in, and no app content is served. The user signed in on their iPhone with Google on 2026-09-21 and landed on the app. They're the first beta account. |
| 3 | Log a set | Pick an exercise, enter weight × reps, save; see today's sets. Fast, tap-based, usable on the phone. | ✅ `0f42a30` + `d6f2363` (dropdown). Verified end to end: the user logged sets on their iPhone and they're in the DB (3 sets, 1 user, no test rows left). User: "looks good for now." |
| 4 | Routines | Create several routines (a split such as Push/Pull/Legs or Upper/Lower); each has ordered days; each day has exercises with **sets × rep range**. Edit them anytime; mark one as **active**. Quick start: PPL / Upper-Lower / Blank (day names only). | Built: migration `002_routines.sql`, `lib/routines.ts`, `/routines` (list, set active, create from a split), `/routines/[id]` (editor: rename, add/remove days, add/remove exercises, sets × rep range, save in one transaction, delete with confirm), a header nav, and a shared `components/exercise-select.tsx` (now also used by the logger). Your first routine becomes active automatically. Ownership guards tested against the real DB with two throwaway users (10/10 pass, cleaned up). ✅ `fbd7aef`. Verified end to end: the user created a real routine on their phone (1 routine, active, 3 days, 4 exercises). User: "this is good enough base for now." **Deferred:** reordering days and exercises (for now, delete and re-add). |
| 5 | Gym flow | Home shows the active routine's **next day by rotation** (the day after the last one trained; overridable) with its exercises ready to log in the weight × reps logger. Free logging of any exercise stays available. | ✅ `690aed6` + `7721622` (Complete workout). Migrations 003–004, `getActivePlan()` and `completeWorkout()` in `lib/routines.ts`, day tagging and an ownership check in `lib/sets.ts`, `lib/rotation.ts` (+ `npm run check`, 10/10), and the plan section in `app/logger.tsx`. SQL tested with throwaway users (9/9, cleaned up). Verified by the user on their phone: "complete works and the next step shows up." DB shows 1 completed workout and 3 day-tagged sets. |
| 6 | Progress | Per exercise: a graph over time with a toggle between **heaviest set per session** and **total volume** (weight × reps summed), plus past sets. Replaces the old "exercise history" feature. | 🟡 Built: `/progress?exercise=…` (`app/progress/`), `listLoggedExerciseIds` and `listSetsForExercise` in `lib/sets.ts`, and `lib/progress.ts` (session grouping + axis ticks, with `lib/progress.check.ts` in `npm run check`). Hand-drawn SVG, no chart library. Visually checked at 375 px with fake data (header at 320–390 px) in headless Chrome. **Not yet verified:** with the user's real data on their phone. |
| 7 | PRs | Per-exercise best, computed from sets, plus manually entered PRs (the better one wins) | 🟡 Built: migration `005_manual_prs.sql`, `lib/prs.ts`, a Charts/PRs tab row on Progress, `/progress/prs` (PR list, add a PR, delete an entered one), and a "New PR" banner in the logger (plate red). The PR rule is `beats()` in `lib/progress.ts` (in `npm run check`). SQL tested with throwaway users (5/5, cleaned up). PRs page visually checked at 375 px; fixed a clipped date field and a doubled divider. **Not yet verified:** on the user's phone. |
| 8 | Exercise library | ~80 common lifts across barbell, dumbbell, machine, cable and bodyweight, covering every muscle group, **plus your own** (private to you). The picker becomes **searchable** — a wheel of 80 is worse than today's 17. | 🟡 Built: migration `007_exercise_library.sql` (**90 exercises**, 6 groups incl. the new **Core**), `exercises.user_id` (null = built-in), `addExercise` + scoped `listExercises` in `lib/sets.ts`, `lib/muscle-groups.ts`, and a rewritten `components/exercise-select.tsx`: a search sheet built on `<dialog>`. SQL tested with throwaway users (9/9, cleaned up). Sheet checked visually; moved initial focus off the search box so the keyboard doesn't cover the list. **Not yet verified:** on the user's phone. |
| 9 | App shell, Home, profile & settings | Bottom tabs (Home · Log · Routines · Progress · Settings); Home = streak + today's workout + week strip; `/welcome` first run collects name, date of birth and optional phone; `/settings` edits them, the weekly target, and signs out. Age rules: 13+ to sign up, sharing off under 18. | 🟡 Built: migration `008_profiles.sql`, `lib/age.ts`, `lib/profile.ts`, `lib/streak.ts` (+ checks for both), the `(app)` route group with `tab-bar.tsx`, `home.tsx`, `/settings`, `/welcome`; the logger moved to `/log`. Build and lint clean, 5/5 check files. Home checked visually; fixed a Base UI warning about link-buttons. **Not yet verified:** on the user's phone, including the first-run flow. |
| 10 | Calendar | A month grid marking days you trained on the **Progress** tab. Tap a day to see its sets, **change which workout it was or mark it freestyle**, and delete a mistaken session. Fixing a wrong day also fixes the rotation. | 🟡 Built: `lib/calendar.ts`, `/progress/calendar` (+ a third Progress tab). Filled = completed, outlined = logged but not completed, today ringed, future days disabled. Day fixes move the day's sets **and** its completion, so rotation follows. SQL tested with throwaway users (7/7, cleaned up); grid checked visually. **Not yet verified:** on the user's phone. |
| 7b | Rest timer | Rest between sets: set per exercise in the routine, or recommended from the rep range when not set. Optional (on/off). User request 2026-09-21. | 🟡 Built: migration `006_rest_seconds.sql`, `lib/rest.ts` (+ check), a rest dropdown per exercise in the routine editor, `components/rest-timer.tsx`, and wiring in the logger. Save SQL re-tested (4/4). Timer states checked visually at 375 px. **Not yet verified:** on the user's phone (the beep in particular). |

### Next: after the beta has been used for real

| # | Feature | Note |
|---|---|---|
| 11 | The push | ✅ Built: `lib/push.ts` (+ checks) and a card in the logger, shown before an exercise's first set of the day. Double progression judged on **working sets** (those at the heaviest weight of the last session), which ignores warm-ups and back-offs with no flag needed. Three outcomes: **add** (green, with a Use button that fills the fields), **hold**, **too heavy**. Step is a flat 5 lb. Only for exercises in the routine day, since it needs a rep range. |
| 12 | Effort per set | ✅ Built: migration `010_set_effort.sql`, `setEffort` in `lib/sets.ts`, and a "How did that feel?" row that appears **after** you log a set (Easy / On target / Hard, tap again to clear). Optional, never blocks logging, and shown under the set in Today. Stored now, used later by the push and a "hard for me?" score. |
| 12b | Bodyweight | ✅ Built: migration `011_bodyweight.sql`, `lib/bodyweight.ts`, and a row on Home showing your latest weight, the change over the window, and a field to save today's (one entry per day; weighing again replaces it). Needed for bulk/cut and for bodyweight-relative comparison later. |
| 12c | Edit a logged set | ✅ Built: `updateSet` in `lib/sets.ts`. Tap any set in Today and it loads into the big weight/reps fields; the button becomes **Save changes**, with Cancel. Typos no longer mean delete and re-enter. |
| 13 | Home-screen install | ✅ Built: `app/manifest.ts`, `app/icon.png` (512) and `app/apple-icon.png` (180) — the user's own mark, plus `appleWebApp` metadata with `viewport-fit: cover`. **Deliberately no web push yet** — that plumbing is what a native app would replace (Direction). |
| 14 | UI/UX polish pass | One dedicated pass once the calendar and first-run screen land and the app's shape is settled. Until then, every feature gets the usual `web-design-guidelines` review (standing rule, not a milestone). |

### Later: parked, don't build yet

**Social (the Strava layer)** — friends, a session feed with kudos, shareable session cards, bodyweight-relative and friends-first leaderboards, challenges. A project, not a feature: profiles, follows, privacy settings, sharing, moderation if anything goes public, plus a data-model change. Worth nothing until logging is effortless and histories are rich (see Direction). User: "we don't have to worry about this for now."

**How-to demos per exercise** — user's idea: "easy links on how-tos for each selection in the exercises — maybe animations, or links to TikTok/Instagram/YouTube based on user choice." Three ways to do it, cheapest first:
1. **Deep-link to a search** on the platform you prefer (a setting: YouTube / TikTok / Instagram), e.g. a "How to" link next to the exercise that opens a search for "<exercise> form". Near-zero work, no licensing, and it covers **custom exercises** too, since it's built from the name. Quality varies because we don't pick the video.
2. **A curated link per built-in exercise** — one good video chosen for each of the 90. Better quality, but it's 90 links to find, and they rot when videos are taken down. Worth it only for the common lifts, with the search fallback for the rest.
3. **Animations** (looping clips or diagrams) — the nicest experience and by far the most expensive: either licensed assets or ones we make, ~90 of them, plus hosting. Only if this becomes a selling point.
**Recommendation:** ship 1, add 2 for the top ~20 lifts if it proves useful. Note embedding TikTok or Instagram content in-app has terms-of-service constraints, whereas linking out does not.

**Native app** — Expo (React Native) sharing `lib/` and types; needed for notifications while locked, HealthKit, and an **Apple Watch** app (the biggest friction win, the closest thing we have to Strava's "press start"). See Direction.

Editing a logged set · Goals (bulk/cut, targets, timeline) · bodyweight tracking · AI program generation and chat (v2) · Apple Health and other health data (v3) · public release work (own domain, Clerk production instance (G11), **replace the Berserk app icon — someone else's IP**, a public landing page, signup polish, Clerk shadcn theme, privacy policy, Sign in with Apple for the App Store) · offline sync · first `/graphify` run

## Ideas inbox

Loose ideas land here so nothing is lost and the Features list stays ordered (the user: "I'm just freestyling ideas here with no real structure"). Each idea gets triaged into a feature, into Later, or dropped — with a reason.

| Idea | Raised | Where it went |
|---|---|---|
| Calendar to track sessions | 2026-09-22 | Shipped (feature 10), on the Progress tab |
| Easy way to switch which workout a day is | 2026-09-22 | Partly shipped (the day dropdown, feature 5); the rest is feature 10 |
| Freestyle day | 2026-09-22 | Shipped as "Off-plan" (feature 5); the calendar adds it for past days |
| Home page with a streak | 2026-09-22 | Feature 9 |
| Settings page | 2026-09-22 | Feature 9 |
| Collect name, phone, age | 2026-09-22 | Feature 9. Phone is **optional** — nothing uses it yet |
| Separate children from adults | 2026-09-22 | Feature 9: 13+ to sign up, sharing off under 18 |
| Bigger exercise list | 2026-09-22 | Shipped (feature 8) |
| Social / friends / public | 2026-09-22 | Later, with notes (see Direction) |
| AI chat that builds routines and pushes you | 2026-09-22 | v2. Scaffolding now: a **Coach tab slot** in the bottom bar, a place on Home for its message, and every write already behind one `lib/` function an agent can call |
| Nicer UI and UX | 2026-09-22 | Standing rule (design review on every feature) + feature 14 |
| Make it a real app | 2026-09-22 | Criteria in Direction; feature 13 is the cheap first step |
| How-to demos per exercise (animations, or TikTok/Instagram/YouTube links) | 2026-09-22 | **Later**, with notes below |

### Feedback from the first real workout (2026-09-22)

The user's own list after training with it. Triaged; batch 1 is the logging screen, which is where every complaint lands.

| # | Feedback | Where it went |
|---|---|---|
| 1 | Sets of one exercise should collapse into one entry, not three rows | Batch 1: Today's list groups by exercise |
| 2 | Skipped Back Squat for Leg Press; the skipped one sat at the top all session | Batch 1: Next exercise + tap any row to return |
| 3 | Must be able to go back to an exercise after Next | Batch 1 |
| 4 | "What happens if I hit Complete workout accidentally?" | ✅ Shipped: **Undo** on the completion banner |
| 5 | Estimate calories from lifts + age + measurements | ✅ Shipped `54c2d26` as a **range** (the user's call). `lib/calories.ts` + checks; shown on the completion summary |
| 6 | Keyboard Done should log the set; button should become Next exercise | Batch 1. **Extra sets stay possible:** at target, Next exercise becomes primary and Log set stays as a secondary |
| 7 | PR effect should be more dramatic | ✅ Shipped `90b2688`: the card moved above the rating row and the timer (below them it fell off-screen, which is what "not dramatic" meant), and leads with the lift in plate red at display size, animated in |
| 8 | Exercise dropdown still shows after choosing | Batch 1: on a routine day the plan rows are the picker; the dropdown becomes a smaller "Other exercise" |
| 9 | Edit difficulty after logging, like weight and reps | Batch 1: tapping a set edits weight, reps, effort and set type |
| 10 | Page transitions feel slow and clunky | ✅ Shipped `90b2688`: one `app/(app)/loading.tsx`. Every route there is dynamic, and **Next skips prefetching a dynamic route entirely unless it has a loading file** — so a tab tap sat on the old screen until the DB answered. Now: instant skeleton plus partial prefetching. **Still open:** Neon's free plan sleeps when idle, so the first tap after a long break still pays a wake-up |
| 11 | Warm-up and drop sets | Batch 1: marked after logging like effort; excluded from 3/3, the push and pre-fill |
| 12 | Exercise selection resets to Back Squat when switching pages | Batch 1: remember the current exercise |
| 13 | Groups with rankings / competition | Later, with **Social** |
| 14 | Today's muscle group should lead the picker | ✅ Shipped `90b2688`: the group most of today's exercises belong to sorts to the top, headed "Legs · today" |
| 15 | Update the routine based on the last workout | ✅ Shipped `28c017b`: the completion summary offers to **add** what you did off-plan (with the sets and rep range you actually hit) and to **drop** what you skipped |
| 16 | "Don't say stay at 150 till you reach 12 — depending on the programme you might go up at rep 7 or 9" | **Fixed immediately.** The push now only gives advice in the one case that's safe for any programme (every working set at the top of the range → add weight). Everything else is a plain recap of last time: "12, 11, 10 reps across 3 sets." **Proper fix, parked:** a per-exercise "add weight at N reps" setting, defaulting to the top of the range |

## Open decisions

| Decision | Options | Recommendation | Status |
|---|---|---|---|
| Getting it on the iPhone | Installed PWA now / Expo (React Native) later / Capacitor / SwiftUI | **Installed PWA now** (feature 13), **Expo when notifications, HealthKit or a Watch app justify it**. The user considers the website temporary and wants an app. Nothing needs rewriting if `lib/` stays UI-free — see Direction. | User restated the goal 2026-09-22; the native framework is still unchosen |

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
| 2026-09-22 | **App icon is the user's own image** | The user supplied `imgs/struggler.jpg` (993×1557, the Brand of Sacrifice from *Berserk*). Squared with `sips` (pad to 1680² on white, then 512 and 180), replacing the generated `icon.tsx`/`apple-icon.tsx`; Next's default `favicon.ico` was deleted so the tab icon matches too. **Static icon files are served at `/icon.png`, not `/icon`**, so the manifest paths changed and the proxy's public-route exception became dead code (the matcher already skips `.png`) — removed. **Flagged, not blocking:** that mark is Kentaro Miura's IP, fine for a private beta, not for an App Store release; it's in Later → public release work. |
| 2026-09-22 | **Four things before going native: effort, bodyweight, set editing, Home-screen install** | Chosen on the principle that **data and rules survive the move to a native app, screens don't**. Effort and bodyweight are the only items that **can't be backfilled**, so they're worth collecting before they're used. Editing a set protects trust in the data everything else is built on. The install is an icon and a manifest only: pleasant now, and the push-notification plumbing is skipped because native would replace it. Deliberately **not** done first: a deep UI pass (gets rebuilt), social, offline sync. The real prerequisite is a few weeks of the user's own logging. |
| 2026-09-22 | **Calories are a range, never a number** | User asked for an estimate and chose "range". MET method: kcal/min = MET × 3.5 × kg / 200, with resistance training spanning **3.5 METs** (steady, long rests) to **6.0** (heavy, short rests) per the Compendium of Physical Activities. Which of those you were is exactly what we can't measure without a heart-rate strap, so both ends are shown and the whole thing is ±30–40%. **Age isn't in the formula** even though the user mentioned it — bodyweight and duration carry it, and adding age would imply a precision that isn't there. Duration is first set to last set, ignoring the rest after your final set, so it errs low rather than flattering. Needs a bodyweight: with none recorded the summary says where to add one instead of guessing. |
| 2026-09-22 | **The logger lists this workout's sets, not today's** | User: "for exercises shown as history in the log page only list exercises that are in the current workout." The list showed everything logged today, so a Legs session finished in the morning still sat under an evening Push session. It now scopes to `routineDayId === current day` — which keeps **off-plan exercises you added to this session** (they're tagged with the day you logged them under) while dropping a different day's work. What you already finished stays visible in its completion summary. Off-plan mode is its own scope (`routineDayId === null`), and that also simplified the Complete button's condition to "this session has a set". |
| 2026-09-22 | **Routine edits are offered at completion, never mid-set** | Feedback 15 ("update the routine based on the last workout"). Completing is the only moment when what you planned and what you did are both final, and it's the one point in a session where a second of attention is free — between sets it would break the speed rule. Off-plan exercises are offered with the sets and rep range **you actually did**, so accepting takes one tap and no typing. Warm-ups and drop sets are ignored on both sides: one warm-up set is not a reason to add an exercise to a routine, nor to keep one. Dropping a skipped exercise is the quieter action (ghost button) because skipping has innocent causes — a busy machine, a short session — and the offer repeats next time if you skip it again. |
| 2026-09-22 | **A dynamic route without `loading.tsx` is never prefetched** | The root of "page transitions feel slow and clunky". Every `(app)` route is dynamic (your data, behind auth), and Next skips prefetching those entirely unless a loading file exists — so each tab tap waited on a cold server round trip with no feedback. One shared `app/(app)/loading.tsx` fixes both halves: an instant skeleton, and partial prefetching of the shell. One generic skeleton rather than five page-shaped ones; the win is immediate feedback, not fidelity. |
| 2026-09-22 | **The push advises only when it's safe for any programme** | User: "don't have a message that says stay at 150 till you reach 12 — depending on the type of program you might go up in weight at rep 7 or 9." Correct: our double-progression trigger (top of the rep range) is one programme's rule, not a universal one, and the card stated it as fact. Now **only the "add weight" case gives advice** — every working set at the top of the range is a signal any programme would accept — and the other states just recap what you did ("12, 11, 10 reps across 3 sets"), with no instruction and no heading that says "stay". A per-exercise **"add weight at N reps"** setting is the real fix; parked. |
| 2026-09-22 | **The push: double progression on working sets** | Every working set at the top of the rep range, and at least the target number of them → add 5 lb and restart at the bottom of the range. Some sets inside the range → stay and add a rep. Every working set below the range → "stay here until it isn't", never an automatic drop, because one bad day isn't a verdict. **Working sets = the sets at the heaviest weight of that session**, which is how warm-ups and back-off sets are excluded without a flag (it also defuses the warm-up gap noted under pre-fill). Shown only before the first set of an exercise each day, to stay out of the way between sets. The suggestion never overrides the pre-fill; tapping **Use** is the accept. |
| 2026-09-22 | **Pre-fill replays your last session, set by set** | The user's rule, after spotting the flaw in the old one: pre-fill used the *latest* set of that exercise, so a back-off or bad-day set became next week's starting point. Now set 1 suggests what set 1 was last session, set 2 what set 2 was, and **a set past last session's count gets no suggestion** (new ground, so an inherited number would be a guess). Logging a set clears any typed value so the next set falls back to the suggestion. Rule and checks in `lib/prefill.ts`; the logger now receives 30 days of sets rather than "the last set per exercise", so an exercise untrained for a month starts blank. **Known gap:** warm-up sets, if logged, count as sets — the effort tap (feature 12) or a warm-up flag is the fix. |
| 2026-09-22 | **Fixing a past day moves its sets and its completion** | The calendar edits a day as a local time range the phone computes and sends, since only the phone knows its timezone. Ranges are capped at 36 h server-side, so a forged range can't rewrite a year. Changing "this workout was Pull" updates that day's sets *and* the completion row, otherwise rotation and history would disagree. Deleting a session removes both, behind a confirm (rare and destructive, unlike logging). |
| 2026-09-22 | **Dark mode: System / Light / Dark** | User asked for it; the app had been light-only, which is rough in a dim gym. Palette roles swap rather than being re-invented (see Design system). **Class-based, not a media query**, because shadcn's `dark:` variant matches `.dark` — a media query would flip our tokens but not the components. An inline script in the root layout applies the stored choice **before paint**, so opening the app in the dark doesn't flash white; `<html suppressHydrationWarning>` covers the class it adds. `color-scheme` is set with it, so native controls and scrollbars follow. `themeColor` now has light and dark variants. On "System" the app follows the phone live, via a `matchMedia` listener. **Lint caught a real mistake:** the first version read the stored choice with `setState` inside an effect; replaced with `useSyncExternalStore`, the same pattern as the rest-timer preference. |
| 2026-09-22 | **No top header; Settings is a tab** | User: "GymBuddy and the Google account in the top is ugly. We don't need that pane. Also move settings to its own page." The header (wordmark + Clerk `UserButton`) is gone: you know what app you're in, and the avatar only led to account management that Settings already covers (it has Sign out). Settings becomes the **fifth tab**, so the gear on Home went too. `body` now carries `pt-[env(safe-area-inset-top)]`, which the header used to provide when installed to the Home Screen. **Five tabs is the ceiling** — when the Coach tab lands, something has to give rather than becoming a sixth. |
| 2026-09-22 | **App structure: bottom tabs, Home first** | The user's own layout: Home (simple, streak, today's workout to start) · Log · Routines · Progress · Settings. Bottom tabs replace the header links, which couldn't fit four on a phone, and they're thumb-reachable mid-workout. Screens live in an `(app)` route group whose layout redirects to `/welcome` until a profile exists; the logger moved from `/` to `/log`. **A fifth tab slot is reserved for Coach** (the AI). Settings is reached from Home's gear icon, not a tab. |
| 2026-09-22 | **Streak = consecutive weeks hitting your weekly target** | Not consecutive days: nobody lifts daily, and a day streak punishes rest days and rewards junk sessions. The target is set at first run (default 3) and editable in settings. An unfinished current week never breaks a streak; it extends it once the target is met. Weeks run Monday–Sunday in the phone's timezone (`lib/streak.ts`, checked). |
| 2026-09-22 | **A day counts only once you tap "Complete workout"** | Asked for after the user saw that one logged set would otherwise count as a workout. Streaks and the week strip now come from the `workouts` table, not from set timestamps. Consequences: a **freestyle session can be completed too** (migration 009 makes `workouts.routine_day_id` nullable), and **Home nudges you** when you've logged sets today but haven't completed. Rotation still ignores freestyle completions, since it only looks at completions on days of the active routine. |
| 2026-09-22 | **Profile and age rules** | First run collects display name (pre-filled from Google), date of birth, an **optional** phone, and the weekly target. **13+ to sign up** (under 13 triggers COPPA's parental-consent regime in the US); **sharing stays off under 18**. Phone was kept optional against the user's "collect all three": nothing uses it yet and it's the most sensitive field, so blocking first run on it costs sign-ups for no gain — say the word to make it required. **Not legal advice; get proper advice before launching social.** |
| 2026-09-22 | **Exercise picker is a search sheet, not a wheel** | 90 exercises don't fit a native `<select>`. The picker is now a trigger button plus a `<dialog>` sheet with search, muscle-group sections and plate dots. `<dialog>` + `showModal()` gives focus trapping, Escape and an inert background with no library and no focus-trap code. Search matches every word, so "in db press" finds "Incline Dumbbell Press". Initial focus is the sheet, not the search box (an iPhone keyboard would cover the list). **Custom exercises:** `exercises.user_id` (null = built-in, shared), unique per owner on `lower(name)` with `NULLS NOT DISTINCT`; adding a name that already exists returns the existing exercise rather than a duplicate. Custom ones are marked "Yours" and are invisible to other users. Not offered in the Progress picker, which lists only exercises you've logged. |
| 2026-09-22 | **Next three: exercise library → calendar → first-run screen** | User asked for a calendar, an easy way to switch the day, freestyle days, a "clean welcome page", a bigger exercise list, social (later), and better UI/UX. Ordered so each helps the next: the **library** first because it's the cheapest fix and forces a **searchable picker** (a UX win on the most-used screen); the **calendar** next (it absorbs "easy way to switch" and "freestyle for the day" alongside the existing day dropdown); then the **first-run screen**. Answers: ~80 lifts **plus custom** exercises; calendar can **view and fix** past days; welcome means the **in-app first run**, not a public landing page. UI/UX is a **standing rule** (every feature gets the design review) plus one polish pass (feature 14) once the shape settles. Social is parked with notes (see Later + Direction). |
| 2026-09-21 | **Rest timer** | User: "include a rest time between sets and exercises… user set in the routine or based on our recommendations." Answers: recommendation **from the rep range** (midpoint ≤5 → 3:00, 6–12 → 2:00, 13+ → 1:00); **no timer between exercises** ("not sure we should have timer between exercises"), so the set that completes an exercise's target starts no timer; **timer optional** (an on/off toggle on the logger, stored per phone in localStorage); **starts automatically** on Log set; **beep + screen change** when rest is over. It then counts time over, in a green state. Off-plan sets use the recommendation for the reps just done. **iOS constraints:** the beep is scheduled at the Log-set tap (iOS only plays audio a tap set up) and is silent with the ringer off. The countdown is timestamp-based, so it's correct after locking the phone, but there's no alert while the page is in the background (that needs push, which comes with feature 10). iPhones can't vibrate from the web. |
| 2026-09-21 | **PRs: definition and placement** | User: "also have a pr option." Built on the earlier decision (manual entries plus computed from sets, the better one wins). **A PR = heaviest weight; at equal weight, more reps; an exact tie keeps the earliest.** One rule, `beats()`, is used everywhere: session top sets, the PR list SQL, and the logger alert. Per-rep-count PRs or an estimated 1RM could come later. PRs live in a **Charts / PRs tab** on Progress (links, each with a URL), because a 4th header link doesn't fit a 360 px phone. The "New PR" alert fires only when you had a best *before* this screen, so a first-ever session doesn't cheer every warm-up; a second PR in the same session is still caught. Deleting the PR set clears its alert. Plate red is used here for the first time (the border and trophy icon; the text stays in ink). |
| 2026-09-21 | **How the Progress chart is built** | Following the dataviz skill. **One line, one axis:** a toggle switches between heaviest set and total volume; they never share an axis. A session is one local calendar day of that exercise. The x-axis uses real dates, so gaps show missed weeks. Line in plate blue (validator: all checks pass on chalk). 2px line, 8px dots with a 2px background ring (hidden past 20 sessions), a 10% area wash, solid hairline grid, round ticks, and only the latest value labelled. **The readout at the top is the tooltip:** scrubbing (drag or arrow keys) updates the big number, because on a phone a tooltip would sit under your finger. The Sessions list is the table view, so no value is chart-only. With one session it shows the number and "log another session", with no one-dot line. No chart library: an SVG this simple costs less than a dependency. The chosen exercise is in the URL. The picker lists only exercises you've logged. |
| 2026-09-21 | **"Complete workout" button** (revises the next row) | User asked: "have a complete workout button." Migration `004_workouts.sql` adds `workouts` (one row per completed routine day). Rotation: if the latest session was completed after its last set, move to the next day, even the same day. A set logged under that day afterwards reopens it, so a mis-tap fixes itself and there's no undo. Forgetting to complete is harmless (tomorrow advances anyway). The button ("Complete Push") sits at the **bottom**, under today's sets, away from Log set, and only appears once the day has a set. After completing, a summary shows sets and total volume. Still no Start button. |
| 2026-09-21 | **Gym flow has no workouts table and no Start/Finish buttons** | Each set stores the `routine_day_id` it was logged under (nullable; `on delete set null`). A *session* is one routine day's sets on one local calendar day. Rotation (`lib/rotation.ts`): if you trained a day of the active routine today, today is that day; otherwise it's the day after the last one trained, wrapping around. It runs on the phone, because "today" is the phone's timezone. Zero extra taps versus plain logging (speed rule). A "today's day" dropdown overrides it, including **Off-plan**; logging a set under the override makes it stick for the day. The logger auto-selects the next unfinished planned exercise and moves on once you hit the target sets; tapping a row picks an exercise manually. Weight/reps pre-fill is now *derived* (last set of the current exercise) unless you type or tap ±, which removed the need for state-syncing effects. |
| 2026-09-21 | **Routine editor saves the whole routine at once** | One Save button and one transaction, instead of an action per field. Simpler, and all-or-nothing. Days and routine exercises have client-generated IDs that are preserved on edit (upsert kept rows, delete removed ones), so workouts can safely point at a day in feature 5. Every upsert has a `WHERE` guard, plus an ownership check, so a forged ID can't touch another user's rows. Unsaved changes: an inline notice, and a browser warning on close/reload. Deleting a *routine* uses a confirm dialog: it's rare, and the speed rule is about logging. |
| 2026-09-21 | **Routines come before history; history folds into Progress** | User: "more than exercise history, have the ability to create a routine that can be modified… multiple routines… set a routine as active, so when you go to the gym you already know which day of the routine it is… and a way to track this routine over time including a graph." And: "a routine would be like push pull legs or upper lower or something else." Split into three shippable steps (features 4–6). Answers: **rotation** day order; targets are **sets × rep range** (weight comes from the last session, not the routine); graph **both** heaviest set per session and total volume, with a toggle; **keep free logging** of off-plan exercises. |
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

### G13 — Headless Chrome won't lay out narrower than ~500 px
- **Symptom:** `--window-size=390,…` produced a screenshot with everything cut off on the right. It looked like a horizontal overflow bug.
- **Cause:** the window has a minimum width (~500 px). The page laid out at that width and the screenshot was cropped to 390.
- **Fix:** use a 500 px window and pin the content under test to a phone width (`style={{ width: 375 }}` plus a dashed edge line) in a throwaway preview route.
- **How to preview a signed-in page:** a temporary `app/zz-preview/` page with fake data, plus a temporary `proxy.ts` bypass for that path. Back up `proxy.ts` first, delete both afterwards, and confirm with `git diff --quiet proxy.ts` and a grep for `zz-preview|TEMPORARY`. Never commit them.
- **Then `rm -rf .next/dev`.** `next dev` writes route types there, and `tsconfig` includes them, so the next `npm run build` fails with `Cannot find module '../../../app/zz-preview/page.js'`. Vercel builds from scratch and is unaffected; it's local only.

### G14 — A pushed commit can get no deployment at all
- **Symptom:** the deploy watcher for `14c98ba` reported `no deployment found` after ~10 min.
- **Cause:** a newer commit (`eaccf09`) was pushed minutes later and Vercel only deployed that one.
- **Not a failure if the newer commit contains it:** check `git merge-base --is-ancestor <old> <new>`, and that the newest deployment is `success`. If the skipped commit was the *latest*, investigate (look at `vercel ls` and the integration's settings).

### G15 — `<dialog>` + React: the sheet wouldn't close (then wouldn't open)
- **Symptom:** picking an exercise left the picker on screen. After a "fix", it stopped opening at all, while its rows still responded.
- **Cause:** React re-renders the `<dialog>` element and undoes `showModal()`/`close()` state. Driving it from a click handler, and then from an effect, each broke differently: first stuck open, then never open.
- **Fix:** don't use `<dialog>` here. The picker is a plain fixed overlay (`role="dialog" aria-modal`), rendered conditionally, with our own Escape handler and body-scroll lock. Predictable, and nothing else owns its state.
- **Also fixed alongside:** a tap that closes the sheet could land on the trigger underneath and reopen it instantly (indistinguishable from "it never closed"); the trigger now ignores taps for 400 ms after closing.
- **How it was caught:** a throwaway preview that clicked through open → pick → re-tap and printed the state onto the page. Beware `--virtual-time-budget`: it fast-forwards timers, so `setTimeout` waits measure *before* React commits and every reading comes out one step stale.

### G16 — A picker inside a `<label>` reopens itself on every pick
- **Symptom:** the exercise sheet closed for an instant when you tapped a row, then reopened. Reported four times; four component-level fixes (dialog → overlay, a reopen guard, `onPointerUp`) all failed, and every isolated test of the component passed.
- **Cause:** in `app/(app)/log/logger.tsx` the picker was wrapped in `<label>…</label>` for its caption. Activating *anything* inside a label forwards activation to that label's control — here, the trigger button. So each pick closed the sheet and the label immediately reopened it. My test page rendered the picker bare, so it never reproduced.
- **Fix:** the overlay now renders on `<body>` through `createPortal`, and the logger uses a `<div>` with a `<span>` caption (the trigger already has its own `aria-label`). `83ad163`.
- **Rule:** when a component misbehaves only on the real screen, stop testing the component — look at what wraps it. And never wrap a custom control in `<label>`; use a caption plus `aria-label`.

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
- **Test scripts in the scratchpad can't see the project's packages.** `require("pg")` failed with `Cannot find module 'pg'`. Run them with `NODE_PATH=<project>/node_modules`.
- **Work out a check's expected values; don't guess them.** The first `niceTicks` assertions failed because I wrote what I *imagined* the ticks would be (steps of 10), not what the rule produces (~4 round steps → 20). The code was right. Derive expectations from the rule, then assert.
- **Quote URLs containing `?` in zsh.** `gh api repos/x/y/git/trees/HEAD?recursive=1` failed with `no matches found` because zsh treats an unquoted `?` as a glob.
- **When a fix keeps failing, question the test, not just the code.** Four attempts at the picker all passed my isolated preview and all failed on the user's phone. The bug was the `<label>` *around* the component, which my preview didn't have. A test that can't reproduce the report isn't evidence the fix worked.
- **Record the unconfirmed as unconfirmed.** A recommendation the user hasn't answered stays in Open decisions, not Decisions made.

---

## Session log

Newest first. When this passes about 10 entries, move the oldest into `docs/tracker-archive.md` so this file stays cheap to load.

### 2026-09-22 — Session 2: first real workout, then its feedback
**Done**
- The user trained with the app for the first time and came back with a 16-item list. Triaged into batch 1 (the logging screen) and batch 2, in the **Feedback** table above.
- Batch 1 shipped: grouped sets, Next exercise, returning to an exercise, keyboard-Done logging, editing effort after the fact, warm-up and drop sets, remembering the selected exercise, and a rebuilt exercise picker.
- Corrected the push after the user caught it stating one programme's rule as fact: it now only advises in the case every programme agrees on.
- Batch 2 shipped: instant page transitions, a PR card you can actually see, today's muscle group first in the picker, and routine tidy-up at completion.

**Problems hit:** G15 and G16 — the exercise picker refused to close on selection through five attempts. The cause was a `<label>` wrapper in the logger, not the component; see G16 and the matching lesson.

**Left open:** Neon's free plan sleeping is the remaining slowness. Feature 14 (the UI polish pass) and social are still parked.

### 2026-09-21 — Session 1 (continued): vision → database → sign-in → logging
**Done**
- Settled the stack and product direction with the user: Next.js backend (not FastAPI/Go); iPhone as a home-screen web app first, native at v3; multi-user product with the user as first beta tester; the "gym buddy that pushes you" vision (top of this file).
- Switched to step-by-step, bare-essentials delivery with a Features list (user request).
- Installed skills, all read before installing, all project-scoped: ponytail, graphify, frontend-design, web-design-guidelines. Neon and Clerk added their own skills on install.
- Feature 1: Neon Postgres (G8–G10). Feature 2: Clerk sign-in, verified on the user's phone (G11, G12).
- Feature 3: schema + migration runner, data access layer, logging screen with the chalk-and-iron design system, and a usability review with fixes. After first use, the user asked for a dropdown instead of exercise buttons, so it was switched to a native `<select>`. Verified with real sets from the user's phone.
- Found and corrected my own earlier mistake: the production domain was public, not protected (G5).

**Problems hit:** G5 (corrected), G8–G12.

**Left open:** feature 4 (exercise history) is next. Shared database for dev and prod (see Current state → Database). "iPhone delivery" remains an open decision (PWA install is feature 9).

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
