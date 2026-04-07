# 클로드 코드 프로젝트 초기화

description: 클로드 코드로 개발하기 위한 프로젝트 초기화  
purpose: 클로드 코드의 컨텍스트를 오직 현재 디렉토리 및 하위 디렉토리로 한정하고, 필요한 모든 하네스를 구축할 수 있는 환경을 제공하는 것.

---

## Steps

1. Check if the current directory is already a git repository by running `git rev-parse --is-inside-work-tree`. If it returns true, skip to step 2. If not, run `git init`, then immediately rename the default branch to `main` with `git branch -M main`.

2. Check if `README.md` already exists. If it does not exist, create `README.md` with this content:

   ```
   # [Project Name]

   > Brief description of what this project does.

   ## Getting Started

   <!-- Add setup instructions here -->
   ```

   Then stage and commit: `git add README.md && git commit -m "first commit"`.
   If `README.md` already exists and a "first commit" has not been made yet, stage whatever files exist and commit with `git commit -m "first commit"`.

3. Ask the user: "연결하고자 하는 GitHub 리포지토리의 주소를 입력하세요. (예: https://github.com/username/repo.git)"

4. Run `git remote add origin <url>` using the URL the user provided. If a remote named `origin` already exists, run `git remote set-url origin <url>` instead.

5. Push the first commit: `git push -u origin main`. If the push fails, inform the user of the error and ask whether to proceed with force push.

6. Create the following files with exactly the content specified below. If a file already exists, skip it and inform the user.

---

### File: `.gitignore`

If `.gitignore` already exists, append the following lines if they are not already present. If it does not exist, create it:

```
CLAUDE.local.md
.claude/settings.local.json
.env
.env.local
*.pyc
__pycache__/
.DS_Store
```

---

### File: `CLAUDE.md`

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

Read `.claude/MEMORY.md` at the start of every session and treat its contents as your working memory. Update MEMORY.md at the end of each session to reflect what was accomplished, decisions made, and what comes next. Keep MEMORY.md under 200 lines at all times — summarize older entries when it approaches the limit.

## Project

<!-- 이 프로젝트가 무엇을 하는지 한두 문장으로 설명하세요 -->

## Tech Stack

<!-- 사용 중인 언어, 프레임워크, 주요 라이브러리를 나열하세요 -->
<!-- 예: Python 3.11, FastAPI, PostgreSQL, Redis -->

## Architecture

<!-- 주요 모듈, 레이어, 데이터 흐름을 러프하게 설명하세요 -->
<!-- 예: src/api → src/service → src/repository → DB -->

## Team Conventions

<!-- 브랜치 전략, 커밋 메시지 규칙, 코드 스타일 등을 적으세요 -->
<!-- 예: feat/이슈번호-설명, Conventional Commits, Black formatter -->

## Key Rules

<!-- 반드시 지켜야 할 규칙을 적으세요 -->

## Slash Commands

- `/init-claude-project` — 새 프로젝트 Claude Code 환경 초기화
- `/enhance-claude-md` — CLAUDE.md 내용을 코드베이스 기반으로 구체화

## Files

- `CLAUDE.md` — project-wide guidance (this file, committed)
- `CLAUDE.local.md` — personal overrides (gitignored)
- `.mcp.json` — MCP server config (committed)
- `.claude/MEMORY.md` — Claude Code working memory (committed)
- `.claude/settings.json` — hooks, permissions, env (committed)
- `.claude/settings.local.json` — personal permission overrides (gitignored)
```

---

### File: `CLAUDE.local.md`

```markdown
# CLAUDE.local.md

Personal overrides for this project. This file is gitignored and must not be committed.

## Local Environment

<!-- 로컬 환경 변수, 개인 API 키 경로, 머신별 경로 설정을 여기에 적으세요 -->

## Personal Preferences

<!-- CLAUDE.md의 규칙을 개인 설정으로 오버라이드하려면 여기에 작성하세요 -->
```

---

### File: `.mcp.json`

```json
{
  "mcpServers": {}
}
```

---

### File: `.claude/MEMORY.md`

```markdown
# MEMORY.md

Claude Code의 작업 메모리 파일입니다. 세션이 시작될 때 읽고, 세션이 끝날 때 업데이트하세요.
이 파일은 사용자가 수정하지 않습니다. Claude Code가 스스로 기록하고 관리합니다.
200줄 제한을 항상 유지하세요. 오래된 항목은 요약하여 압축하세요.

## Current State

- Project initialized: (오늘 날짜로 기입)
- Last session: (오늘 날짜로 기입)
- Status: initial setup complete

## Recent Decisions

<!-- 중요한 설계 결정, 선택한 이유, 포기한 대안을 기록하세요 -->

## In Progress

<!-- 현재 작업 중인 항목을 기록하세요 -->

## Next Steps

<!-- 다음 세션에서 해야 할 일을 기록하세요 -->

## Known Issues

<!-- 알려진 버그, 기술 부채, 해결해야 할 문제를 기록하세요 -->
```

Replace `(오늘 날짜로 기입)` with today's actual date in YYYY-MM-DD format.

---

### File: `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [],
    "deny": []
  },
  "hooks": {},
  "env": {}
}
```

---

### File: `.claude/settings.local.json`

```json
{
  "permissions": {
    "allow": [],
    "deny": []
  },
  "enableAllProjectMcpServers": false
}
```

---

### File: `.claude/plans/PLAN.md`

```markdown
# PLAN.md

Claude Code의 실행 계획 저장소입니다. 작업을 시작하기 전에 계획을 이 파일에 기록하고, 실행 중 변경사항을 반영하세요.

## 사용 방법

- 새 작업을 시작할 때: 목표, 접근 방식, 단계별 계획을 아래 형식으로 작성하세요.
- 계획이 변경될 때: 원본을 수정하지 말고 변경 이유와 함께 업데이트하세요.
- 작업이 완료될 때: 결과와 잔여 항목을 기록하고 MEMORY.md에 요약을 옮기세요.

## 현재 계획

(작업 시작 시 Claude Code가 이 섹션을 채웁니다.)

---

## 계획 템플릿

\`\`\`

### [작업 제목]

**목표**: 이 작업이 달성하려는 것

**접근 방식**: 선택한 방법과 그 이유

**단계**:

- [ ] 1.
- [ ] 2.
- [ ] 3.

**완료 기준**: 언제 이 작업이 완료되었다고 볼 수 있는가

**관련 파일**: 수정이 예상되는 주요 파일 목록
\`\`\`
```

---

### File: `.claude/commands/enhance_claude_md.md`

```markdown
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
```

---

### File: `.claude/agents/diagram_maker/mermaid_template.md`

````markdown
# Diagram Maker Agent

You are a diagram generation agent. You receive a diagram type and a scope (a directory path or file name), then output a valid Mermaid.js diagram.

## Input

The user will provide:

- **type**: one of `flowchart`, `sequenceDiagram`, `classDiagram`, `erDiagram`, `stateDiagram`, `gitGraph`, `mindmap`, `timeline`
- **scope**: a directory path (e.g. `src/api/`) or a specific file name (e.g. `src/engine/simulator.py`)

## Steps

1. Read all files within the given scope. If a directory is provided, recursively list and read relevant source files. If a single file is provided, read only that file.

2. Based on the diagram type, extract the relevant information:
   - `flowchart`: identify functions, methods, and their call relationships
   - `sequenceDiagram`: identify actors (modules, classes, services) and the messages/calls between them in time order
   - `classDiagram`: identify classes, their attributes, methods, and inheritance or association relationships
   - `erDiagram`: identify data models/schemas and their foreign key or logical relationships
   - `stateDiagram`: identify states and transitions (look for state machines, status fields, or workflow logic)
   - `gitGraph`: run `git log --oneline --graph` to represent branch and merge history
   - `mindmap`: represent the top-level concepts and sub-concepts found in the scope
   - `timeline`: identify time-ordered events or phases in the code (e.g., initialization → processing → teardown)

3. Output ONLY a fenced code block containing valid Mermaid.js syntax. Do not add explanation before or after the code block.

## Output Format

````
```mermaid
[diagram content here]
````
````

````

## Rules

- Never invent relationships that do not exist in the code.
- If the scope is too large to diagram completely, focus on the top-level structure and note which sub-areas were omitted.
- If the requested diagram type does not fit the scope (e.g., `erDiagram` on a utility module with no data models), say so and suggest a more appropriate type.
- Always produce syntactically valid Mermaid.js.
```

---

### File: `.claude/rules/duty.md`

```markdown
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
```

---

### Final Step

After creating all files, run:

```
git add CLAUDE.md .mcp.json .claude/settings.json .claude/MEMORY.md .claude/plans/ .claude/commands/ .claude/agents/ .claude/rules/
git commit -m "chore: initialize Claude Code project harness"
```

Do NOT stage `CLAUDE.local.md` or `.claude/settings.local.json` — they are gitignored.

Confirm to the user that initialization is complete and list all created files. Remind the user to fill in the `## Tech Stack`, `## Architecture`, and `## Team Conventions` sections in `CLAUDE.md`, or run `/enhance-claude-md` to have Claude fill them in automatically.
````
