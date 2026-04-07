# Enhance CLAUDE.md

Read the current codebase and fill in the incomplete sections of CLAUDE.md with accurate, specific information.

## Steps

1. Read the current `CLAUDE.md` to identify which sections are empty or contain only placeholder comments.

2. Explore the repository structure to understand the directory layout. Read dependency files such as `package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, or equivalent to identify the tech stack and versions.

3. Trace the architecture in depth using the following sub-steps:

   a. **Entry point**: Find the main entry file (e.g. `src/extension.ts`, `main.py`, `cmd/main.go`). Read it fully and identify what it registers, initializes, or wires together.

   b. **Layer mapping**: For each import or dependency the entry point references, read those files and identify which architectural layer they belong to (e.g. UI, service, repository, model, controller). Build a mental map of `LayerA → LayerB → LayerC`.

   c. **Module inventory**: List every top-level directory and file under `src/` (or equivalent). For each, note its role — even if the file is a scaffold placeholder, record it as "planned but not yet implemented".

   d. **Data flow**: Trace at least one complete user action end-to-end — from the UI trigger (event, command, API call) through each service/handler, down to the persistence or output layer. Write this as a numbered flow.

   e. **Framework-specific mechanics**: If the project uses a framework (VSCode Extension, Express, FastAPI, etc.), identify which framework APIs bridge the layers — e.g. which VSCode contribution points (`commands`, `webviews`, `treeDataProvider`, etc.) connect user interaction to the service layer. If an external process is spawned (CLI, subprocess), note how and where.

   f. **Planned vs actual**: Clearly separate what is currently implemented from what is designed/planned. If the CLAUDE.md describes an intended architecture that does not yet exist in code, mark those layers as `(planned)`.

   g. **Key files**: List the 3–7 most important files in the codebase with a one-line description of each.

4. Scan for convention signals: read `.eslintrc`, `.prettierrc`, `pyproject.toml` (for black/ruff config), git log for commit message patterns, and any existing test files for testing conventions.

5. Rewrite the CLAUDE.md sections with the information you found:
   - **Project**: one-sentence description of what the project does
   - **Tech Stack**: concrete list with versions where detectable
   - **Architecture**: use the findings from step 3 to write:
     - A layer diagram (`LayerA → LayerB → LayerC`)
     - A data flow walkthrough for a representative user action
     - A "Key Files" table listing the 3–7 most important files with one-line roles
     - A "Planned vs Actual" note if the codebase is still being scaffolded
   - **Team Conventions**: commit message format, formatting tools, branch naming (infer from git log if not documented)
   - **Key Rules**: non-obvious rules that Claude must follow when editing this codebase

6. Do not overwrite sections the user has already written. Only fill in `<!-- ... -->` placeholder blocks or visibly empty sections.

7. After updating CLAUDE.md, report what was filled in automatically and what still needs the user to complete manually.
