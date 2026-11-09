# Short copy/paste prompts for Claude Code

## First new session (do not paste full spec)
Read `CLAUDE.md`, `docs/INDEX.md`, `docs/STATE.md`, and `docs/TASKS.md`. Determine the next unfinished task. Read ONLY that task's required spec files and relevant existing code. Implement that one task with tests, update `docs/STATE.md`, then reply in <=8 lines: changed paths, tests, blockers, next task. No entire file dumps. Do not rebuild finished features.

## Any later task in a NEW session
Continue the next incomplete task from `docs/STATE.md`. Follow `CLAUDE.md` and `docs/TASKS.md`; read only its listed specs and affected code. Make smallest safe patch; run targeted tests; update STATE; respond <=8 lines. Stop after one task.

## When the context grows
Use `/context` to inspect usage, then `/compact` with a focus on current task and code paths, or start a fresh session after saving the STATE. Use `/clear` only if no unsaved context is needed. Avoid dumping logs and whole files into chat.

## Review focused requirement
Review only ACC-07/08/09 in `docs/ACCEPTANCE.md`, `docs/INVENTORY.md`, the checkout/PSP SQL and handlers. Identify failures and add targeted tests; don't read other sections.
