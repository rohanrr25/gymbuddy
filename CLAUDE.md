@AGENTS.md
@TRACKER.md

## Keep TRACKER.md current

`TRACKER.md` (imported above) is this project's running memory. It's how the next session knows what happened in this one.

Update it **during** the work, not only at the end:

- **A problem took more than one attempt** → add a numbered entry under *Gotchas & fixes*: symptom (with the exact error text), cause, fix.
- **The user makes or confirms a decision** → move it from *Open decisions* to *Decisions made*, with the why. Your own recommendations stay in *Open decisions* until the user answers.
- **You make a process mistake** → add it under *Lessons for Claude*.
- **End of session** → add a *Session log* entry (Done / Problems hit / Left open) and refresh *Current state* and *Next up*.

Keep the top sections describing the present; history goes in the log. The repo is public: never write secrets, tokens, or connection strings into the tracker.
