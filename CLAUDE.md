@AGENTS.md
@TRACKER.md

## Keep TRACKER.md current

`TRACKER.md` (imported above) is this project's running memory. It's how the next session knows what happened in this one.

Update it **during** the work, not only at the end:

- **A problem took more than one attempt** → add a numbered entry under *Gotchas & fixes*: symptom (with the exact error text), cause, fix.
- **The user makes or confirms a decision** → move it from *Open decisions* to *Decisions made*, with the why. Your own recommendations stay in *Open decisions* until the user answers.
- **You make a process mistake** → add it under *Lessons for Claude*.
- **A feature starts or finishes** → update its status in *Features*. Work only on the top unfinished feature, and build only what its "done" line needs.
- **End of session** → add a *Session log* entry (Done / Problems hit / Left open) and refresh *Current state* and *Next up*.

Keep the top sections describing the present; history goes in the log. The repo is public: never write secrets, tokens, or connection strings into the tracker.

## Skills

- **ponytail** governs what gets built: take the simplest thing that works. One standing exception to its terse-output rule: the user is using this project to learn frontend (React, Next.js, Tailwind, shadcn). Explaining *why* on frontend and architecture choices counts as explicitly requested, so give it in full. Ponytail still applies to the code itself.
- **graphify:** once `graphify-out/` exists, use it for questions about how the codebase fits together. `graphify-out/` is gitignored and must never be committed.
