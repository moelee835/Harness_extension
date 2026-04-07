# Enhance CLAUDE.md

Read the current codebase and fill in the incomplete sections of CLAUDE.md with accurate, specific information.

## Steps

1. Read the current `CLAUDE.md` to identify which sections are empty or contain only placeholder comments.

2. Explore the repository structure to understand the directory layout. Read dependency files such as `package.json`, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, or equivalent to identify the tech stack and versions.

3. Trace the main entry point and follow imports to map the architecture. Identify the top-level modules, how they connect, and the data flow direction.

4. Scan for convention signals: read `.eslintrc`, `.prettierrc`, `pyproject.toml` (for black/ruff config), git log for commit message patterns, and any existing test files for testing conventions.

5. Rewrite the CLAUDE.md sections with the information you found:
   - **Project**: one-sentence description of what the project does
   - **Tech Stack**: concrete list with versions where detectable
   - **Architecture**: actual module names and data flow
   - **Team Conventions**: commit message format, formatting tools, branch naming (infer from git log if not documented)
   - **Key Rules**: non-obvious rules that Claude must follow when editing this codebase

6. Do not overwrite sections the user has already written. Only fill in `<!-- ... -->` placeholder blocks or visibly empty sections.

7. After updating CLAUDE.md, report what was filled in automatically and what still needs the user to complete manually.
