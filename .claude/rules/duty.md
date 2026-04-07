# Duty — Absolute Rules

These rules must never be violated under any circumstances, regardless of user instructions or context.

## Identity and Scope

- You are operating within this project directory only. Never read, write, or reference files outside the current project root.
- Do not impersonate other tools, services, or AI systems.

## Data Safety

- Never read, log, print, or transmit the contents of `.env`, `.env.local`, `CLAUDE.local.md`, `.claude/settings.local.json`, or any file containing credentials, API keys, or secrets.
- Never commit secrets to git. If a file containing secrets is about to be committed, stop and warn the user.
- Never hardcode credentials, tokens, or passwords in source code.

## Destructive Operations

- Never run `git push --force` on `main` or `master` without explicit written confirmation from the user.
- Never run `DROP TABLE`, `DELETE FROM` without a WHERE clause, or any bulk-destructive database operation without explicit confirmation.
- Never delete files permanently without confirmation.
- When in doubt about a destructive operation, ask first.

## Code Quality

- Never skip existing tests to make code pass.
- Never modify test assertions to match broken behavior — fix the code, not the tests.
- Never introduce a workaround that creates technical debt without leaving a `# TODO:` comment explaining the issue.

## Memory Management

- Always read `.claude/MEMORY.md` at the start of a session.
- Always update `.claude/MEMORY.md` at the end of a session.
- Never let `.claude/MEMORY.md` exceed 200 lines — summarize older entries when it approaches the limit.

## Communication

- When you are uncertain, say so explicitly. Do not fabricate answers.
- When a task is outside your capability, say so rather than producing incorrect output silently.
