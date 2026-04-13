/**
 * Claude Code 프로젝트 초기화 내장 프롬프트.
 * vibe_context/init-claude-project.md 내용을 번들에 포함하기 위해 TypeScript 상수로 관리한다.
 * 외부 파일 의존 없이 Extension 번들에 포함된다.
 * F-007: InitService가 이 상수를 로드하여 CLI 에이전트에 전달한다.
 */
export const INIT_CLAUDE_PROJECT_PROMPT = `# 클로드 코드 프로젝트 초기화

description: 클로드 코드로 개발하기 위한 프로젝트 초기화  
purpose: 클로드 코드의 컨텍스트를 오직 현재 디렉토리 및 하위 디렉토리로 한정하고, 필요한 모든 하네스를 구축할 수 있는 환경을 제공하는 것.

---

## Steps

1. Check if the current directory is already a git repository by running \`git rev-parse --is-inside-work-tree\`. If it returns true, skip to step 2. If not, run \`git init\`, then immediately rename the default branch to \`main\` with \`git branch -M main\`.

2. Check if \`README.md\` already exists. If it does not exist, create \`README.md\` with this content:

   \`\`\`
   # [Project Name]

   > Brief description of what this project does.

   ## Getting Started

   <!-- Add setup instructions here -->
   \`\`\`

   Then stage and commit: \`git add README.md && git commit -m "first commit"\`.
   If \`README.md\` already exists and a "first commit" has not been made yet, stage whatever files exist and commit with \`git commit -m "first commit"\`.

3. Ask the user: "연결하고자 하는 GitHub 리포지토리의 주소를 입력하세요. (예: https://github.com/username/repo.git)"

4. Run \`git remote add origin <url>\` using the URL the user provided. If a remote named \`origin\` already exists, run \`git remote set-url origin <url>\` instead.

5. Push the first commit: \`git push -u origin main\`. If the push fails, inform the user of the error and ask whether to proceed with force push.

6. Create the following files with exactly the content specified below. If a file already exists, skip it and inform the user.

---

### File: \`.gitignore\`

If \`.gitignore\` already exists, append the following lines if they are not already present. If it does not exist, create it:

\`\`\`
CLAUDE.local.md
.claude/settings.local.json
.env
.env.local
*.pyc
__pycache__/
.DS_Store
\`\`\`

---

### File: \`CLAUDE.md\`

\`\`\`markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

Read \`.claude/MEMORY.md\` at the start of every session and treat its contents as your working memory. Update MEMORY.md at the end of each session to reflect what was accomplished, decisions made, and what comes next. Keep MEMORY.md under 200 lines at all times — summarize older entries when it approaches the limit.

## Project

<!-- 이 프로젝트가 무엇을 하는지 한두 문장으로 설명하세요 -->

## Tech Stack

<!-- 사용 중인 언어, 프레임워크, 주요 라이브러리를 나열하세요 -->
<!-- 예: Python 3.11, FastAPI, PostgreSQL, Redis -->

## Architecture

<!-- 주요 모듈, 레이어, 데이터 흐름을 러프하게 설명하세요 -->
<!-- 예: src/api → src/service → src/repository → DB -->

## Team Conventions

<!-- 브랜치 전략, 코드 스타일 등을 적으세요 -->
<!-- 예: feat/이슈번호-설명, Black formatter -->

커밋 메세지는 반드시 다음 세 가지를 포함하여 상세하게 작성하세요:

- **title**: 변경 내용 한 줄 요약
- **change**: 구체적으로 무엇이 바뀌었는지
- **purpose**: 왜 이 변경이 필요했는지

## Key Rules

Plan mode나 실행 계획을 저장하는 경우 반드시 전역 폴더가 아닌 현재 프로젝트의 \`.claude/plans/PLAN.md\`에 기록하세요.
"plan에 따라 실행"하라는 명령을 받으면 반드시 \`.claude/plans/PLAN.md\`를 먼저 읽고 수행하세요.

어떤 작업이든 수행하기 전에는 \`.claude/MEMORY.md\` 파일의 기억을 참고하세요.
어떤 작업이든 수행하고 난 다음에는 반드시 \`.claude/MEMORY.md\` 파일을 갱신하여 항상 최신 메모리를 유지하세요.

<!-- 이 프로젝트에서 반드시 지켜야 할 추가 규칙을 적으세요 -->

## Slash Commands

- \`/init-claude-project\` — 새 프로젝트 Claude Code 환경 초기화
- \`/enhance-claude-md\` — CLAUDE.md 내용을 코드베이스 기반으로 구체화
- \`/extract_features_json\` — 요구사항 분석 후 specs/features.json 생성
- \`/configure_loop\` — Ralph Loop 기반 자동 코딩 루프 환경 설정
- \`/synch_with_ADR\` — ADR.md 기반 CLAUDE.md 동기화

## Files

- \`CLAUDE.md\` — project-wide guidance (this file, committed)
- \`CLAUDE.local.md\` — personal overrides (gitignored)
- \`.mcp.json\` — MCP server config (committed)
- \`.claude/MEMORY.md\` — Claude Code working memory (committed)
- \`.claude/settings.json\` — hooks, permissions, env (committed)
- \`.claude/settings.local.json\` — personal permission overrides (gitignored)
\`\`\`

---

### File: \`CLAUDE.local.md\`

\`\`\`markdown
# CLAUDE.local.md

Personal overrides for this project. This file is gitignored and must not be committed.

## Local Environment

<!-- 로컬 환경 변수, 개인 API 키 경로, 머신별 경로 설정을 여기에 적으세요 -->

## Personal Preferences

<!-- CLAUDE.md의 규칙을 개인 설정으로 오버라이드하려면 여기에 작성하세요 -->
\`\`\`

---

### File: \`.mcp.json\`

\`\`\`json
{
  "mcpServers": {}
}
\`\`\`

---

### File: \`.claude/MEMORY.md\`

\`\`\`markdown
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
\`\`\`

Replace \`(오늘 날짜로 기입)\` with today's actual date in YYYY-MM-DD format.

---

### File: \`.claude/settings.json\`

\`\`\`json
{
  "permissions": {
    "allow": [],
    "deny": []
  },
  "hooks": {},
  "env": {}
}
\`\`\`

---

### File: \`.claude/settings.local.json\`

\`\`\`json
{
  "permissions": {
    "allow": [],
    "deny": []
  },
  "enableAllProjectMcpServers": false
}
\`\`\`

---

### File: \`.claude/plans/PLAN.md\`

\`\`\`markdown
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

\\\`\\\`\\\`

### [작업 제목]

**목표**: 이 작업이 달성하려는 것

**접근 방식**: 선택한 방법과 그 이유

**단계**:

- [ ] 1.
- [ ] 2.
- [ ] 3.

**완료 기준**: 언제 이 작업이 완료되었다고 볼 수 있는가

**관련 파일**: 수정이 예상되는 주요 파일 목록
\\\`\\\`\\\`
\`\`\`

---

### File: \`.claude/commands/enhance_claude_md.md\`

\`\`\`markdown
# Enhance CLAUDE.md

Read the current codebase and fill in the incomplete sections of CLAUDE.md with accurate, specific information.

## Steps

1. Read the current \`CLAUDE.md\` to identify which sections are empty or contain only placeholder comments.

2. Explore the repository structure to understand the directory layout. Read dependency files such as \`package.json\`, \`pyproject.toml\`, \`requirements.txt\`, \`Cargo.toml\`, \`go.mod\`, or equivalent to identify the tech stack and versions.

3. Trace the main entry point and follow imports to map the architecture. Identify the top-level modules, how they connect, and the data flow direction.

4. Scan for convention signals: read \`.eslintrc\`, \`.prettierrc\`, \`pyproject.toml\` (for black/ruff config), git log for commit message patterns, and any existing test files for testing conventions.

5. Rewrite the CLAUDE.md sections with the information you found:
   - **Project**: one-sentence description of what the project does
   - **Tech Stack**: concrete list with versions where detectable
   - **Architecture**: actual module names and data flow
   - **Team Conventions**: commit message format, formatting tools, branch naming (infer from git log if not documented)
   - **Key Rules**: non-obvious rules that Claude must follow when editing this codebase

6. Do not overwrite sections the user has already written. Only fill in \`<!-- ... -->\` placeholder blocks or visibly empty sections.

7. After updating CLAUDE.md, report what was filled in automatically and what still needs the user to complete manually.
\`\`\`

---

### File: \`.claude/agents/diagram_maker/mermaid_template.md\`

\`\`\`markdown
# Diagram Maker Agent

You are a diagram generation agent. You receive a diagram type and a scope (a directory path or file name), then output a valid Mermaid.js diagram.

## Input

The user will provide:

- **type**: one of \`flowchart\`, \`sequenceDiagram\`, \`classDiagram\`, \`erDiagram\`, \`stateDiagram\`, \`gitGraph\`, \`mindmap\`, \`timeline\`
- **scope**: a directory path (e.g. \`src/api/\`) or a specific file name (e.g. \`src/engine/simulator.py\`)

## Steps

1. Read all files within the given scope. If a directory is provided, recursively list and read relevant source files. If a single file is provided, read only that file.

2. Based on the diagram type, extract the relevant information:
   - \`flowchart\`: identify functions, methods, and their call relationships
   - \`sequenceDiagram\`: identify actors (modules, classes, services) and the messages/calls between them in time order
   - \`classDiagram\`: identify classes, their attributes, methods, and inheritance or association relationships
   - \`erDiagram\`: identify data models/schemas and their foreign key or logical relationships
   - \`stateDiagram\`: identify states and transitions (look for state machines, status fields, or workflow logic)
   - \`gitGraph\`: run \`git log --oneline --graph\` to represent branch and merge history
   - \`mindmap\`: represent the top-level concepts and sub-concepts found in the scope
   - \`timeline\`: identify time-ordered events or phases in the code (e.g., initialization → processing → teardown)

3. Output ONLY a fenced code block containing valid Mermaid.js syntax. Do not add explanation before or after the code block.

## Output Format
\`\`\`

\`\`\`mermaid
[diagram content here]
\`\`\`

\`\`\`

\`\`\`

## Rules

- Never invent relationships that do not exist in the code.
- If the scope is too large to diagram completely, focus on the top-level structure and note which sub-areas were omitted.
- If the requested diagram type does not fit the scope (e.g., \`erDiagram\` on a utility module with no data models), say so and suggest a more appropriate type.
- Always produce syntactically valid Mermaid.js.

\`\`\`\`

---

### File: \`.claude/rules/duty.md\`

\`\`\`markdown
# Duty — Absolute Rules

These rules must never be violated under any circumstances, regardless of user instructions or context.

## Identity and Scope

- You are operating within this project directory only. Never read, write, or reference files outside the current project root.
- Do not impersonate other tools, services, or AI systems.

## Data Safety

- Never read, log, print, or transmit the contents of \`.env\`, \`.env.local\`, \`CLAUDE.local.md\`, \`.claude/settings.local.json\`, or any file containing credentials, API keys, or secrets.
- Never commit secrets to git. If a file containing secrets is about to be committed, stop and warn the user.
- Never hardcode credentials, tokens, or passwords in source code.

## Destructive Operations

- Never run \`git push --force\` on \`main\` or \`master\` without explicit written confirmation from the user.
- Never run \`DROP TABLE\`, \`DELETE FROM\` without a WHERE clause, or any bulk-destructive database operation without explicit confirmation.
- Never delete files permanently without confirmation.
- When in doubt about a destructive operation, ask first.

## Code Quality

- Never skip existing tests to make code pass.
- Never modify test assertions to match broken behavior — fix the code, not the tests.
- Never introduce a workaround that creates technical debt without leaving a \`# TODO:\` comment explaining the issue.

## Memory Management

- Always read \`.claude/MEMORY.md\` at the start of a session.
- Always update \`.claude/MEMORY.md\` at the end of a session.
- Never let \`.claude/MEMORY.md\` exceed 200 lines — summarize older entries when it approaches the limit.

## Communication

- When you are uncertain, say so explicitly. Do not fabricate answers.
- When a task is outside your capability, say so rather than producing incorrect output silently.
\`\`\`\`

---

### File: \`.claude/ADR.md\`

If this file does not already exist, create it as an empty file.

---

### File: \`.claude/commands/configure_loop.md\`

\`\`\`\`\`markdown
# Configure Loop

Ralph Loop 기반 장기 에이전트 하네스를 현재 프로젝트에 설정합니다.
AGENTS.md, IMPLEMENTATION_PLAN.md, PROMPT_plan.md, PROMPT_build.md, loop.sh를 생성하여
반복 실행 루프를 즉시 구동할 수 있는 환경을 만듭니다.

---

## 필수 선행 독해

**이 커맨드를 실행하기 전에 반드시 아래 문서를 읽어야 합니다.**

\`.claude/external_knowledges/ralph_longterm_combined.md\` 를 전체 읽습니다.

이 문서는 Ralph Loop 방법론(Geoffrey Huntley / Clayton Farr)과 Anthropic의 장기 에이전트 패턴을 통합한 설계 보고서입니다.
이 커맨드의 모든 단계, 파일 구조, 운영 원칙은 해당 문서에서 도출됩니다.
문서를 읽지 않고 아래 단계를 수행하면 방법론의 의도를 놓치게 됩니다.

---

## 전제 조건

**\`specs/features.json\`이 반드시 먼저 존재해야 합니다.**

이 파일이 없으면 이 커맨드를 실행할 수 없습니다.
\`/extract_features_json\` 커맨드를 먼저 실행하여 기능 목록을 생성하십시오.

\`specs/features.json\`이 존재하는지 확인합니다. 없으면 즉시 중단하고 다음 메시지를 출력합니다:

> \`specs/features.json\`이 없습니다. 먼저 \`/extract_features_json\`을 실행하여 기능 목록을 생성하세요.

---

## 사전 확인

전제 조건이 충족되면, 아래 파일들의 존재 여부를 확인합니다.

1. \`AGENTS.md\` — 빌드·검증 명령 문서
2. \`IMPLEMENTATION_PLAN.md\` — 진행 상황 추적 파일
3. \`PROMPT_plan.md\` — Initializer Agent 참조 프롬프트
4. \`PROMPT_build.md\` — Coding Agent 프롬프트
5. \`loop.sh\` — 외부 반복 실행 루프

각 파일이 없으면 아래 단계에 따라 생성합니다.
이미 존재하는 파일은 내용을 읽어 확인한 뒤, 현재 프로젝트 상태와 맞지 않는 부분만 업데이트합니다.

---

## Steps

### Step 1 — 기술 스택 조사

이 단계의 목적은 프로젝트에서 사용하는 언어·프레임워크·빌드 도구를 파악하고,
이후 AGENTS.md와 PROMPT_build.md에 삽입할 **실제 검증 명령**을 확정하는 것입니다.

#### 1-a. 언어·런타임 감지

아래 파일들 중 존재하는 것을 읽어 사용 언어와 런타임을 파악합니다.

| 감지 파일                                        | 의미                              |
| ------------------------------------------------ | --------------------------------- |
| \`package.json\`                                   | Node.js / JavaScript / TypeScript |
| \`pyproject.toml\`, \`setup.py\`, \`requirements.txt\` | Python                            |
| \`Cargo.toml\`                                     | Rust                              |
| \`go.mod\`                                         | Go                                |
| \`pom.xml\`, \`build.gradle\`                        | Java / Kotlin                     |
| \`*.csproj\`, \`*.sln\`                              | C# / .NET                         |
| \`pubspec.yaml\`                                   | Dart / Flutter                    |
| \`mix.exs\`                                        | Elixir                            |
| \`Gemfile\`                                        | Ruby                              |
| \`composer.json\`                                  | PHP                               |

여러 파일이 존재하면 모두 읽어 주요 언어를 결정합니다.

#### 1-b. 빌드·검증 명령 목록 작성

감지된 언어를 기준으로 아래 표에서 해당 도구 조합을 파악합니다.
파악한 명령은 변수로 기록하여 이후 단계에서 재사용합니다.

| 언어 / 도구              | 타입 체크                                   | 린트                                  | 단위 테스트                          | 빌드                                   |
| ------------------------ | ------------------------------------------- | ------------------------------------- | ------------------------------------ | -------------------------------------- |
| **Node.js + TypeScript** | \`npm run check-types\` (또는 \`tsc --noEmit\`) | \`npm run lint\` (ESLint)               | \`npm test\`                           | \`npm run build\` 또는 \`npm run compile\` |
| **Node.js + JavaScript** | —                                           | \`npm run lint\` (ESLint/Prettier)      | \`npm test\`                           | \`npm run build\`                        |
| **Python (pytest)**      | \`mypy .\` 또는 \`pyright\`                     | \`ruff check .\` 또는 \`flake8\`          | \`pytest\`                             | \`python -m build\` 또는 해당 없음       |
| **Rust**                 | \`cargo check\`                               | \`cargo clippy\`                        | \`cargo test\`                         | \`cargo build --release\`                |
| **Go**                   | \`go vet ./...\`                              | \`golangci-lint run\`                   | \`go test ./...\`                      | \`go build ./...\`                       |
| **Java (Maven)**         | —                                           | \`mvn checkstyle:check\`                | \`mvn test\`                           | \`mvn package\`                          |
| **Java (Gradle)**        | —                                           | \`./gradlew checkstyleMain\`            | \`./gradlew test\`                     | \`./gradlew build\`                      |
| **C# (.NET)**            | \`dotnet build\` (포함)                       | —                                     | \`dotnet test\`                        | \`dotnet build\`                         |
| **Dart / Flutter**       | \`dart analyze\`                              | \`dart format --set-exit-if-changed .\` | \`flutter test\` 또는 \`dart test\`      | \`flutter build\`                        |
| **Ruby**                 | —                                           | \`rubocop\`                             | \`bundle exec rspec\` 또는 \`rake test\` | —                                      |
| **PHP**                  | \`vendor/bin/phpstan analyse\`                | \`vendor/bin/phpcs\`                    | \`vendor/bin/phpunit\`                 | —                                      |

표에 없는 언어·도구는 \`package.json\`의 \`scripts\` 섹션, \`Makefile\`, \`justfile\`, \`taskfile.yml\` 등을 읽어 직접 파악합니다.

#### 1-c. 프레임워크별 추가 규칙 파악

감지된 프레임워크에 따라 아래 특수 규칙을 추가로 파악합니다.

- **VSCode Extension**: \`dist/\` 직접 편집 금지, \`vscode\` 모듈 번들 외부 처리, \`context.subscriptions.push()\` 필수, \`package.json#contributes.commands\`와 \`registerCommand\` ID 일치
- **React / Vue / Svelte**: 컴포넌트 단위 테스트, 스냅샷 테스트 주의
- **FastAPI / Django / Flask**: DB 마이그레이션 상태 확인 필요, 환경변수 파일(\`.env\`) 존재 여부 확인
- **Flutter**: \`flutter pub get\` 선행 필요, 플랫폼별 빌드 커맨드 분리
- **Rust**: \`unsafe\` 사용 시 주석 의무, \`cargo fmt\` 자동 포맷 필요

#### 1-d. 기술 스택 요약 기록

파악한 내용을 아래 형식으로 메모합니다 (이후 단계에서 참조).

\`\`\`
[기술 스택 요약]
언어: <감지된 언어 및 버전>
런타임: <Node.js 22 / Python 3.12 / Rust 1.80 / ...>
프레임워크: <VSCode Extension / React / FastAPI / ...>
빌드 도구: <esbuild / webpack / cargo / gradle / ...>

[검증 게이트 — 이 순서로 실행]
① 타입 체크: <명령 또는 "해당 없음">
② 린트:      <명령>
③ 테스트:    <명령>
④ 빌드:      <명령 또는 "해당 없음">

[세션 스모크 체크 — 매 반복 시작 시]
<타입 체크> && <린트> && <빌드>

[프레임워크 특수 규칙]
- <파악된 규칙 목록>
\`\`\`

---

### Step 2 — 현재 프로젝트 상태 파악

1. \`specs/features.json\`을 읽어 전체 기능 목록과 각 항목의 \`passes\` 상태를 파악합니다.
   - \`passes: false\` 항목 수 = 미구현 기능
   - \`passes: true\` 항목 수 = 구현 완료 기능
2. \`git log --oneline -10\`을 실행하여 최근 커밋 히스토리를 확인합니다.
3. \`.claude/MEMORY.md\`를 읽어 이전 세션 맥락을 파악합니다.

---

### Step 3 — AGENTS.md 생성 또는 갱신

\`AGENTS.md\`가 없으면 Step 1에서 파악한 기술 스택 정보를 사용하여 아래 형식으로 생성합니다.
이미 있으면 내용을 읽은 뒤, Step 1의 검증 게이트와 불일치하는 부분만 수정합니다.

생성할 내용 형식 (꺽쇠 항목은 Step 1 결과로 채울 것):

\`\`\`markdown
# AGENTS.md

이 파일은 Ralph Loop 기반 Coding Agent가 매 세션 시작 시 반드시 읽어야 합니다.
빌드·검증 명령과 운영 규칙을 기술합니다.

## 프로젝트 개요

<프로젝트 한 줄 설명>
언어: <언어 및 버전> | 런타임: <런타임> | 프레임워크: <프레임워크>

## 검증 명령 (반드시 이 순서로 실행)

1. <타입 체크 명령> — <도구명 및 역할>
2. <린트 명령> — <도구명 및 역할>
3. <테스트 명령> — <테스트 프레임워크 및 범위>
4. <빌드 명령> — <빌드 도구 및 출력물>

> 모든 명령이 exit code 0으로 종료될 때만 커밋 허용.
> 단 하나라도 실패하면 에러를 읽고 수정 후 처음부터 재실행.
> 해당 없는 단계(예: 동적 언어의 타입 체크)는 건너뜁니다.

## 세션 시작 시 스모크 체크

매 세션 시작 시 반드시 실행:
<스모크 체크 명령 (타입 체크 && 린트 && 빌드)>

> 스모크 체크 실패 시 새 기능 구현 전에 반드시 수정 먼저.

## 운영 규칙

- 한 번에 하나의 기능만 구현할 것 (specs/features.json의 우선순위 순)
- 모든 검증을 통과한 후에만 git commit 할 것
- specs/features.json의 \`passes\` 필드 외 내용은 절대 수정하지 말 것
- description과 steps는 삭제·수정 금지 — 요구사항 진실 원천이므로
- 커밋 메시지는 \`feat(F-XXX): 기능 설명 — 변경 내용 및 이유\` 형식으로 작성

## 프레임워크 특수 규칙

<Step 1-c에서 파악한 프레임워크별 규칙을 항목으로 작성>
\`\`\`

---

### Step 4 — IMPLEMENTATION_PLAN.md 생성 또는 갱신

\`IMPLEMENTATION_PLAN.md\`가 없으면 \`specs/features.json\`의 현재 상태를 읽어 아래 형식으로 생성합니다.
이미 있으면 현재 \`passes\` 상태와 비교하여 "완료된 기능" 수와 "다음 우선 작업" 항목을 최신화합니다.

생성할 내용 형식:

\`\`\`markdown
# IMPLEMENTATION_PLAN.md

## 현재 상태 (마지막 업데이트: [오늘 날짜])

- 완료된 기능: [passes: true 항목 수]개 / 전체 [총 항목 수]개
- 마지막 커밋: [git log --oneline -1 결과]

## 다음 우선 작업

[passes: false인 항목 중 priority 기준 상위 5개를 나열]

- [ ] [id]: [description] (category: [category])

## 구현 순서 가이드

[레이어 의존성이 있는 프로젝트라면 의존성 기반 순서를 기술.
없으면 specs/features.json의 priority 순서대로 진행한다고 기재.]

## 알려진 이슈 / 기술 부채

- (없음 — 구현 시작 전)

## 세션 로그

### [오늘 날짜] — configure_loop 실행

- Ralph Loop 하네스 환경 초기 설정 완료
- 생성된 파일: AGENTS.md, IMPLEMENTATION_PLAN.md, PROMPT_plan.md, PROMPT_build.md, loop.sh
\`\`\`

---

### Step 5 — PROMPT_plan.md 생성 (없을 경우에만)

\`PROMPT_plan.md\`는 Initializer Agent 전용 참조 프롬프트입니다.
\`specs/features.json\`이 이미 존재하는 상태에서 이 커맨드가 실행되므로, Initializer 단계는 완료된 상태입니다.
파일이 없으면 아래 내용으로 생성합니다 (향후 신규 프로젝트 참조용).

\`\`\`markdown
# PROMPT_plan.md — Initializer Agent (참조용)

> 이 프롬프트는 specs/features.json이 없는 새 프로젝트의 최초 초기화 시 사용됩니다.
> 현재 프로젝트는 \`/extract_features_json\`으로 이미 features.json이 생성되어 있습니다.

## 지시사항

1. \`pwd\`를 실행하여 작업 디렉토리를 확인합니다.
2. 프로젝트 문서(CLAUDE.md, README 등)를 읽어 요구사항과 아키텍처를 파악합니다.
3. 프로젝트의 기술 스택을 조사합니다 (언어·런타임·빌드 도구 감지).
4. \`/extract_features_json\`을 실행하여 \`specs/features.json\`을 생성합니다.
5. \`AGENTS.md\`를 작성합니다 (기술 스택에 맞는 실제 검증 명령 및 운영 규칙).
6. \`IMPLEMENTATION_PLAN.md\` 초안을 작성합니다.
7. \`git add -A && git commit -m "init: Ralph Loop 하네스 초기 설정 완료"\`
\`\`\`

---

### Step 6 — PROMPT_build.md 생성 또는 갱신

Coding Agent가 매 반복 시작 시 읽는 핵심 프롬프트입니다.
검증 명령은 AGENTS.md를 읽어 파악하도록 작성합니다 — 언어·프레임워크에 무관하게 동작합니다.
없으면 생성하고, 있으면 현재 프로젝트 상태와 맞는지 확인 후 필요한 부분만 수정합니다.

생성할 내용:

\`\`\`\`markdown
# PROMPT_build.md — Coding Agent (Ralph Loop)

이 프롬프트는 loop.sh가 매 반복마다 Coding Agent에게 전달합니다.
반드시 아래 순서를 따르고, 단계를 건너뛰지 마십시오.

---

## 세션 시작 루틴 (매 반복 필수)

1. \`pwd\` — 작업 디렉토리가 프로젝트 루트인지 확인
2. \`AGENTS.md\` 읽기 — **검증 명령**과 **프레임워크 특수 규칙** 숙지
   (이 파일이 이 세션에서 실행할 모든 명령의 기준입니다)
3. \`IMPLEMENTATION_PLAN.md\` 읽기 — 이전 세션에서 무엇을 했는지, 다음 작업이 무엇인지 파악
4. \`git log --oneline -10\` — 최근 커밋 히스토리 확인
5. AGENTS.md에 명시된 **스모크 체크** 실행
   - 실패 시: 새 기능 구현 전에 반드시 수정 먼저

---

## 구현 사이클 (6단계)

### ① 스펙 확인

\`specs/features.json\`을 읽어 \`passes: false\`인 항목 중
IMPLEMENTATION_PLAN.md의 구현 순서 가이드를 참고하여 최우선 기능 하나를 선택합니다.

### ② 계획 갱신

\`IMPLEMENTATION_PLAN.md\`의 "다음 우선 작업" 항목이 현재 선택한 기능과 일치하는지 확인합니다.
불일치하면 파일을 업데이트합니다.

### ③ 단일 구현

선택한 기능 **하나만** 구현합니다. 범위를 벗어나지 마십시오.
AGENTS.md의 "프레임워크 특수 규칙"을 반드시 준수합니다.

### ④ 검증 (AGENTS.md의 "검증 명령" 순서대로)

AGENTS.md에 기재된 검증 게이트를 순서대로 실행합니다.
모두 exit code 0이어야 합니다.

### ⑤ 실패 시 수정

에러 메시지를 읽고 정확한 원인을 파악합니다.
수정 후 ④로 복귀합니다. 검증 우회(임시 주석, 타입 캐스팅 등)는 금지합니다.

### ⑥ 성공 시 커밋

\`\`\`
1. specs/features.json에서 구현된 기능의 passes를 true로 변경
2. implemented_in_commit 필드에 커밋 해시 기록 (git rev-parse HEAD 참조)
3. git add -A
4. git commit -m "feat(F-XXX): [기능 설명]

- 변경: [어떤 파일에 무엇을 추가/수정했는지]
- 이유: [왜 이 방식으로 구현했는지]
- 검증: [AGENTS.md의 검증 게이트] 모두 통과"
5. IMPLEMENTATION_PLAN.md 갱신 (완료 기능 수, 세션 로그 추가)
\`\`\`

---

## 절대 금지 사항

- 여러 기능을 한 번에 구현하는 것
- 검증 없이 커밋하는 것
- specs/features.json의 description, steps 수정 또는 삭제
- 검증 우회 수단 사용 (언어별: \`// @ts-ignore\`, \`# type: ignore\`, \`#[allow(unused)]\`, \`//nolint\` 등)
- 세션 종료 전 IMPLEMENTATION_PLAN.md 미갱신
\`\`\`\`

---

### Step 7 — loop.sh 생성 (없을 경우에만)

\`loop.sh\`가 없으면 아래 내용으로 생성합니다.
있으면 내용을 읽어 현재 프로젝트와 맞는지 확인만 합니다.

\`\`\`bash
#!/bin/bash
# loop.sh — Ralph Loop 기반 장기 실행 에이전트 하네스
# 참고: .claude/external_knowledges/ralph_longterm_combined.md
# 사용법: bash loop.sh [최대반복횟수]
# 예시:   bash loop.sh 50

MAX_ITERATIONS=\${1:-999}
ITERATION=0

echo "=== Ralph Loop 시작 (최대 \${MAX_ITERATIONS}회) ==="

# 전제 조건 확인: specs/features.json이 존재해야 함
if [ ! -f "specs/features.json" ]; then
  echo "오류: specs/features.json이 없습니다."
  echo "먼저 /extract_features_json 커맨드를 실행하여 기능 목록을 생성하세요."
  exit 1
fi

# Coding Agent 반복 실행 (Ralph Loop)
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "=== Coding Agent 반복 #$ITERATION / 최대 $MAX_ITERATIONS ==="

  # 완료되지 않은 기능이 남아 있는지 확인 (jq 필요)
  if command -v jq &>/dev/null; then
    REMAINING=$(jq '[.[] | select(.passes == false)] | length' specs/features.json)
    if [ "$REMAINING" -eq 0 ]; then
      echo "모든 기능 구현 완료 (specs/features.json 기준). 루프를 종료합니다."
      break
    fi
    echo "남은 기능: \${REMAINING}개"
  fi

  # Coding Agent 실행
  claude --print --prompt-file PROMPT_build.md

  echo "반복 #$ITERATION 완료."
done

echo ""
echo "=== Ralph Loop 종료 (총 \${ITERATION}회 실행) ==="
\`\`\`

생성 후 실행 권한을 부여합니다:

\`\`\`bash
chmod +x loop.sh
\`\`\`

---

### Step 8 — 결과 보고

모든 파일 생성·갱신이 완료되면 다음 항목을 보고합니다:

1. **감지된 기술 스택**: 언어, 런타임, 프레임워크, 확정된 검증 게이트 명령
2. **생성·갱신된 파일 목록**: 각 파일 경로와 역할
3. **현재 기능 현황**: \`specs/features.json\` 기준 완료/미완료 수
4. **다음 실행 방법**:
   - 단일 반복: \`bash loop.sh 1\`
   - 전체 자동: \`bash loop.sh\`
   - 수동 실행: \`claude --print --prompt-file PROMPT_build.md\`
5. **주의사항**: \`loop.sh\`는 \`jq\` CLI가 설치되어 있어야 남은 기능 수를 계산할 수 있음.

---

## 참고 — Ralph Loop 핵심 원칙

이 설정의 이론적 기반: \`.claude/external_knowledges/ralph_longterm_combined.md\`

| 원칙                   | 적용                                                                             |
| ---------------------- | -------------------------------------------------------------------------------- |
| 컨텍스트는 소모품이다  | 매 세션은 AGENTS.md, IMPLEMENTATION_PLAN.md, git log로 스스로 컨텍스트 재구성    |
| 계획은 부패한다        | IMPLEMENTATION_PLAN.md는 매 커밋마다 현행화, specs/features.json이 진실 원천     |
| 지시보다 압력이 강하다 | AGENTS.md의 검증 게이트 전부 통과해야만 커밋 허용 — 언어 무관하게 동일 원칙 적용 |
\`\`\`\`\`

---

### File: \`.claude/commands/extract_features_json.md\`

\`\`\`\`markdown
# Extract Features JSON

프로젝트의 요구사항 문서를 분석하여 \`specs/features.json\`을 생성합니다.
각 항목은 end-to-end 사용자 시나리오 단위로 추출하며,
Ralph Loop 기반 Coding Agent가 읽고 순차적으로 구현할 수 있는 형식으로 작성합니다.

---

## 필수 선행 독해

**이 커맨드를 실행하기 전에 반드시 아래 문서를 읽어야 합니다.**

\`.claude/external_knowledges/ralph_longterm_combined.md\` 섹션 5.1 (\`specs/features.json\` 설계)을 읽습니다.

특히 아래 두 원칙을 반드시 숙지하십시오:

- **기능은 end-to-end 사용자 시나리오 단위**로 세분화합니다. 기술적 구현 단위(함수, 클래스, 모듈)가 아닙니다.
- **\`passes\` 필드 외 내용은 생성 후 절대 수정 금지**입니다. Anthropic의 표현대로: _"It is unacceptable to remove or edit tests."_

---

## 전제 조건

\`specs/features.json\`이 이미 존재하는 경우:

- 기존 항목을 수정하거나 삭제하지 않습니다.
- 새로 추출된 기능 중 기존 파일에 없는 항목만 추가합니다.
- 중복 여부는 \`description\`의 의미 유사도로 판단합니다.

---

## Steps

### Step 1 — 요구사항 문서 수집

아래 파일들 중 존재하는 것을 모두 읽어 요구사항을 파악합니다.
우선순위 순으로 읽습니다.

1. \`CLAUDE.md\` — 프로젝트 목적, 아키텍처, 주요 기능 기술
2. \`README.md\` 또는 \`README.ko.md\` — 사용자 대상 기능 설명
3. \`docs/PRD.md\`, \`docs/requirements.md\`, \`docs/spec.md\` 또는 유사한 문서
4. \`.claude/plans/PLAN.md\` — 구현 계획에 기술된 기능 목록
5. \`docs/\` 또는 \`spec/\` 디렉토리 하위의 모든 마크다운 파일
6. 위 파일이 없으면 프로젝트 루트의 마크다운 파일 전체를 탐색

읽은 문서 목록을 메모합니다.
요구사항이 명시적으로 없거나 매우 추상적인 경우, 코드베이스의 디렉토리 구조와 기존 파일을 탐색하여 의도된 기능을 추론합니다.

---

### Step 2 — 기능 추출 원칙 적용

수집한 요구사항에서 기능을 추출할 때 아래 원칙을 반드시 준수합니다.

#### 올바른 기능 단위 (추출 대상 ✅)

기능은 **"사용자가 X를 할 수 있다"** 형식의 end-to-end 시나리오입니다.

\`\`\`
✅ "사용자가 새 채팅을 시작하면 입력창이 열린다"
✅ "사용자가 Init 버튼을 클릭하면 에이전트가 .claude/ 디렉토리를 생성한다"
✅ "Extension이 VSCode 워크스페이스 열기 시 오류 없이 활성화된다"
\`\`\`

#### 잘못된 기능 단위 (추출 금지 ❌)

\`\`\`
❌ "FileManager 클래스를 구현한다"        → 기술 구현 단위, 사용자 시나리오 아님
❌ "src/service/ 디렉토리를 생성한다"     → 프로젝트 설정 작업
❌ "IAgentRunner 인터페이스를 정의한다"   → 내부 설계 단위
\`\`\`

단, 인프라성 요구사항(빌드, 배포, 타입 검사 통과 등)은 \`"infrastructure"\` 카테고리로 포함합니다.

#### 카테고리 분류

| category         | 기준                                                    |
| ---------------- | ------------------------------------------------------- |
| \`functional\`     | 사용자가 직접 인식하고 상호작용하는 기능                |
| \`infrastructure\` | 빌드, 배포, 타입 검사, 패키징, 테스트 환경 등 기반 요소 |

#### 우선순위(priority) 부여

숫자가 낮을수록 높은 우선순위입니다.

- \`1\`: 시스템이 동작하기 위한 최소 전제 조건 (핵심 진입점, 기본 초기화 등)
- \`2\`: 핵심 사용자 흐름 (메인 기능 경로)
- \`3\`: 보조 기능, 설정, 커스터마이징
- \`4\`: 엣지 케이스, 에러 처리, 경고 메시지
- \`5\`: 성능, 접근성, 문서화 등 품질 개선 항목

---

### Step 3 — features.json 항목 작성

각 기능을 아래 JSON 스키마에 맞춰 작성합니다.

\`\`\`json
{
  "id": "F-001",
  "category": "functional",
  "priority": 1,
  "description": "사용자가 [행동]하면 [결과]가 된다",
  "steps": [
    "전제 조건 또는 탐색 시작점을 설정한다",
    "사용자 행동을 실행한다 (클릭, 입력, 명령 실행 등)",
    "예상 결과가 나타나는지 확인한다",
    "부수 효과(파일 생성, 상태 변경 등)가 있으면 함께 확인한다"
  ],
  "passes": false,
  "implemented_in_commit": null,
  "notes": ""
}
\`\`\`

#### 필드 작성 규칙

| 필드                    | 규칙                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| \`id\`                    | \`F-\` 접두사 + 3자리 숫자. 기존 파일이 있으면 마지막 id 이후 번호부터 시작.                          |
| \`category\`              | \`"functional"\` 또는 \`"infrastructure"\` 중 하나만 사용.                                              |
| \`priority\`              | 1~5 정수. 동일 우선순위 허용.                                                                       |
| \`description\`           | **"사용자가 ~할 수 있다"** 또는 **"~가 ~한다"** 형식. 기술 용어보다 사용자 언어 우선.               |
| \`steps\`                 | 검증자(QA 또는 에이전트)가 따라할 수 있는 구체적인 단계. 최소 3개, 최대 8개. 각 단계는 동사로 시작. |
| \`passes\`                | 항상 \`false\`로 초기화. 절대 \`true\`로 설정하지 말 것.                                                |
| \`implemented_in_commit\` | 항상 \`null\`로 초기화.                                                                               |
| \`notes\`                 | 항상 \`""\`로 초기화.                                                                                 |

#### steps 작성 패턴

steps는 E2E 검증 절차입니다. 아래 패턴을 참고합니다.

\`\`\`
"[탐색/진입] ~로 이동한다 / ~를 연다 / ~를 실행한다"
"[행동]       ~를 클릭한다 / ~를 입력한다 / ~를 선택한다"
"[확인]       ~가 표시되는지 확인한다 / ~가 생성되는지 확인한다"
"[부수 효과]  ~파일이 존재하는지 확인한다 / ~상태가 변경되었는지 확인한다"
"[에러 없음]  오류 메시지가 없는지 확인한다 / 콘솔에 에러가 없는지 확인한다"
\`\`\`

---

### Step 4 — specs/features.json 파일 저장

1. \`specs/\` 디렉토리가 없으면 생성합니다.
2. \`specs/features.json\`이 없으면 추출한 전체 배열을 새로 씁니다.
3. \`specs/features.json\`이 이미 있으면:
   a. 기존 파일을 읽어 현재 id 목록을 파악합니다.
   b. 새로 추출한 기능 중 \`description\`이 기존 항목과 의미상 중복되지 않는 항목만 선별합니다.
   c. 선별된 새 항목을 기존 배열 뒤에 추가합니다. id는 기존 최대값 이후 번호를 부여합니다.
   d. 기존 항목은 어떤 필드도 변경하지 않습니다.
4. 최종 JSON이 유효한지 확인합니다 (배열 형식, 필드 누락 없음).

---

### Step 5 — 결과 보고

파일 저장이 완료되면 다음 항목을 보고합니다:

1. **참조한 요구사항 문서 목록**: 어떤 파일을 읽었는지
2. **추출된 기능 수**: 신규 추가 X개 / 기존 유지 Y개 / 전체 Z개
3. **카테고리별 분포**: functional X개, infrastructure Y개
4. **priority별 분포**: 각 우선순위 항목 수
5. **주의 필요 항목**: 요구사항이 모호하여 추론으로 작성된 항목 목록 (있을 경우)
6. **다음 단계**: \`/configure_loop\`을 실행하여 루프 환경을 설정하세요.

---

## 생성 후 불변 규칙

\`specs/features.json\`이 생성된 이후에는 아래 규칙이 영구적으로 적용됩니다.

> **\`passes\` 필드만 수정 가능합니다.**
> \`id\`, \`category\`, \`priority\`, \`description\`, \`steps\`는 어떠한 이유로도 수정하거나 삭제할 수 없습니다.
> 요구사항이 변경된 경우에는 기존 항목을 수정하는 대신 새 항목을 추가합니다.
> 이 규칙은 ralph*longterm_combined.md의 핵심 원칙에서 도출됩니다:
> *"It is unacceptable to remove or edit tests."\\_
\`\`\`\`

---

### File: \`.claude/commands/synch_with_ADR.md\`

\`\`\`markdown
# sync with ARD.md

ADR.md 파일에 적힌 내용을 토대로 CLAUDE.md,
\`\`\`

---

### File: \`.claude/external_knowledges/ralph_longterm_combined.md\`

\`\`\`\`markdown
# Ralph Loop 기반 장기 실행 에이전트 하네스 설계

> **출처 결합**: Anthropic "Effective harnesses for long-running agents" (2025.11.26) × Ralph Loop 방법론 (Geoffrey Huntley / Clayton Farr)

---

## 개요

\`claude_code_longterm.md\`는 **무엇이 문제인지**와 **어떤 구조적 아티팩트가 필요한지**를 설명합니다.  
\`Ralph_loop.md\`는 **어떻게 그 구조를 운영하는지**를 설명합니다.

이 문서는 두 접근법을 통합하여, Ralph Loop의 운영 철학 위에서 Anthropic의 장기 에이전트 패턴을 구현하는 설계 보고서입니다.

---

## 1. 실패 모드 매핑

두 문서가 공통으로 지적하는 실패 원인은 동일합니다.

| 실패 패턴                 | Anthropic 진단                             | Ralph Loop 진단                       |
| ------------------------- | ------------------------------------------ | ------------------------------------- |
| 한 번에 너무 많이 하려 함 | 컨텍스트 소진 후 절반만 구현된 상태 방치   | 긴 대화 맥락 누적으로 품질 저하       |
| 조기 완료 선언            | 진행 상태를 잘못 판단하고 "완료"라 선언    | "대충 끝났다"고 종료하는 성급한 수렴  |
| 검증 없는 완료 처리       | 단위 테스트만 통과시키고 E2E 검증 생략     | 테스트·린트·빌드 없이 작업 종료       |
| 이전 세션 상태 파악 실패  | 새 컨텍스트에서 이전 작업 추측에 시간 낭비 | 대화창이 아닌 파일에 상태를 두지 않음 |

**핵심 통찰**: Anthropic이 제시한 아티팩트(progress file, feature list, git commit)는 Ralph Loop의 "파일 기반 상태 관리" 원칙과 완벽하게 대응됩니다.

---

## 2. 개념 대응표

두 방법론의 구성요소를 1:1로 매핑합니다.

| Ralph Loop 구성요소      | Anthropic 대응 구성요소    | 통합 역할                                                           |
| ------------------------ | -------------------------- | ------------------------------------------------------------------- |
| \`specs/\`                 | \`feature_list.json\`        | 요구사항의 진실 원천(Source of Truth). 무엇을 만들어야 하는지 기록. |
| \`IMPLEMENTATION_PLAN.md\` | \`claude-progress.txt\`      | 현재까지의 진행 상황과 다음 우선순위 기록.                          |
| \`AGENTS.md\`              | \`init.sh\`                  | 빌드·실행·검증 방법과 운영 규칙 정리.                               |
| \`PROMPT_plan.md\`         | Initializer Agent 프롬프트 | 초기 환경 설정 및 계획 수립 지시.                                   |
| \`PROMPT_build.md\`        | Coding Agent 프롬프트      | 단일 기능 구현 및 검증 지시.                                        |
| \`loop.sh\`                | 외부 하네스 루프           | 에이전트를 반복 실행시키는 셸 스크립트.                             |

---

## 3. 통합 아키텍처

### 3.1 파일 구조

\`\`\`
project-root/
├── specs/                        # (Ralph: specs/) 기능 요구사항 진실 원천
│   └── features.json             # (Anthropic: feature_list.json) passes 필드로 상태 추적
├── AGENTS.md                     # (Ralph: AGENTS.md) + (Anthropic: init.sh) 통합
├── IMPLEMENTATION_PLAN.md        # (Ralph: IMPLEMENTATION_PLAN.md) + (Anthropic: claude-progress.txt) 통합
├── PROMPT_plan.md                # Initializer Agent 전용 프롬프트
├── PROMPT_build.md               # Coding Agent 전용 프롬프트
├── loop.sh                       # 외부 반복 실행 루프
└── .git/                         # 커밋 기반 상태 복원 기반
\`\`\`

### 3.2 두 단계 에이전트 분리 (Anthropic 핵심 패턴)

Ralph Loop는 루프 구조를 제공하지만, **초기화 단계와 구현 단계를 구분하지 않습니다.**  
Anthropic의 핵심 인사이트는 **첫 번째 컨텍스트 윈도우를 특별 취급**해야 한다는 것입니다.

\`\`\`
첫 번째 실행 (Initializer Agent)
  └─ PROMPT_plan.md 사용
  └─ 수행 작업:
       - specs/features.json 생성 (모든 기능을 passes: false로)
       - AGENTS.md 작성 (빌드·테스트·실행 명령 문서화)
       - IMPLEMENTATION_PLAN.md 초안 작성
       - 초기 git commit 생성
       - 개발 서버 구동 스크립트 포함

두 번째 이후 실행 (Coding Agent, Ralph Loop)
  └─ PROMPT_build.md 사용
  └─ loop.sh가 반복 실행
  └─ 각 반복에서: 읽기 → 선택 → 구현 → 검증 → 커밋
\`\`\`

---

## 4. 통합 운영 흐름

### 4.1 Initializer Agent (PROMPT_plan.md)

\`\`\`markdown
## Initializer Agent 지시사항

1. pwd를 실행하여 작업 디렉토리를 확인합니다.
2. 사용자의 요구사항을 분석하여 specs/features.json을 생성합니다.
   - 모든 기능은 초기에 "passes": false로 설정합니다.
   - 기능은 end-to-end 사용자 시나리오 단위로 세분화합니다.
   - category, description, steps, passes 필드를 포함합니다.
3. AGENTS.md를 작성합니다:
   - 개발 서버 실행 명령
   - 테스트 실행 명령 (단위 테스트, 타입 체크, 린트, 빌드)
   - 기본 E2E 검증 절차
4. IMPLEMENTATION_PLAN.md 초안을 작성합니다.
5. git init 및 초기 커밋을 생성합니다.
\`\`\`

### 4.2 Coding Agent (PROMPT_build.md) — Ralph Loop 구조 적용

Ralph Loop의 6단계 사이클이 그대로 적용됩니다.

\`\`\`
① 스펙 확인      → specs/features.json 읽기 (passes: false인 최우선 기능 선택)
② 계획 갱신      → IMPLEMENTATION_PLAN.md 읽고 현재 목표 확인/갱신
③ 단일 구현      → 선택한 기능 하나만 구현 (Ralph: "가장 중요한 작업 하나만")
④ 검증 (압력)    → AGENTS.md의 검증 명령 실행: 테스트 + 타입체크 + 린트 + 빌드 + E2E
⑤ 실패 시 수정   → 에러를 읽고 수정 후 ④로 복귀 (Ralph: backpressure)
⑥ 성공 시 커밋   → features.json의 passes를 true로, git commit, IMPLEMENTATION_PLAN.md 갱신
\`\`\`

### 4.3 세션 시작 루틴 (Anthropic 패턴)

\`\`\`markdown
## Coding Agent 세션 시작 시 필수 순서

1. \`pwd\` 실행 — 작업 디렉토리 확인
2. \`AGENTS.md\` 읽기 — 빌드·테스트 명령 파악
3. \`IMPLEMENTATION_PLAN.md\` 읽기 — 이전 세션에서 무엇을 했는지 파악
4. \`git log --oneline -20\` — 최근 커밋 히스토리 확인
5. AGENTS.md의 개발 서버 시작 명령 실행
6. **기본 E2E 테스트 실행** — 이전 세션이 앱을 깨진 상태로 두지 않았는지 확인
7. specs/features.json에서 passes: false인 최우선 기능 선택
8. 구현 시작
\`\`\`

> **왜 6번(E2E 테스트 먼저)이 중요한가**: 깨진 상태에서 새 기능을 구현하면 문제가 누적됩니다.  
> Anthropic의 실험에서 이 단계가 "세션 낭비"를 가장 효과적으로 줄였습니다.

---

## 5. 핵심 파일 설계

### 5.1 specs/features.json

Ralph Loop의 \`specs/\`와 Anthropic의 \`feature_list.json\`을 결합한 형태입니다.

\`\`\`json
[
  {
    "id": "feat-001",
    "category": "functional",
    "priority": 1,
    "description": "사용자가 새 채팅을 시작할 수 있다",
    "steps": [
      "메인 인터페이스로 이동",
      "'새 채팅' 버튼 클릭",
      "새 대화가 생성되는지 확인",
      "채팅 영역이 초기 상태를 표시하는지 확인"
    ],
    "passes": false,
    "implemented_in_commit": null,
    "notes": ""
  }
]
\`\`\`

> **중요**: \`passes\` 필드만 수정 가능. description, steps 절대 삭제/수정 금지.  
> (Anthropic: "It is unacceptable to remove or edit tests")

### 5.2 AGENTS.md

Ralph Loop의 \`AGENTS.md\`와 Anthropic의 \`init.sh\`를 통합한 문서입니다.

\`\`\`markdown
# AGENTS.md

## 개발 서버 실행

npm run dev

## 검증 명령 (반드시 이 순서로 실행)

1. npm run type-check # TypeScript 타입 검사
2. npm run lint # ESLint
3. npm run test # 단위 테스트
4. npm run build # 빌드
5. npm run test:e2e # E2E 테스트 (Puppeteer 등)

## 기본 E2E 스모크 테스트

세션 시작 시 반드시 실행:

- 개발 서버 시작
- 메인 페이지 접근 확인
- 핵심 기능 1개 동작 확인

## 운영 규칙

- 한 번에 하나의 기능만 구현할 것
- 모든 검증을 통과한 후에만 커밋할 것
- specs/features.json의 passes 필드 외 내용은 수정하지 말 것
\`\`\`

### 5.3 IMPLEMENTATION_PLAN.md

Ralph Loop의 \`IMPLEMENTATION_PLAN.md\`와 Anthropic의 \`claude-progress.txt\`를 통합합니다.

\`\`\`markdown
# IMPLEMENTATION_PLAN.md

## 현재 상태 (마지막 업데이트: [날짜])

- 완료된 기능: X개 / 전체 Y개
- 마지막 커밋: [커밋 해시] - [커밋 메시지]

## 다음 우선 작업

- [ ] feat-003: 메시지 스트리밍 응답 표시 (priority: 1)
- [ ] feat-007: 대화 기록 사이드바 (priority: 2)

## 알려진 이슈 / 기술 부채

- (없음)

## 세션 로그

### [날짜] 세션

- feat-001 완료: 새 채팅 생성 기능 구현 및 E2E 검증 통과
- feat-002 완료: 메시지 전송 기능 구현
\`\`\`

---

## 6. loop.sh 설계

Ralph Loop의 외부 루프를 Anthropic의 두 단계 에이전트 구조에 맞게 확장합니다.

\`\`\`bash
#!/bin/bash
# loop.sh — Ralph Loop 기반 장기 실행 에이전트 하네스

MAX_ITERATIONS=\${1:-999}
ITERATION=0

# 첫 번째 실행: Initializer Agent
if [ ! -f "specs/features.json" ]; then
  echo "=== Initializer Agent 실행 ==="
  claude --print --prompt-file PROMPT_plan.md
  git add -A && git commit -m "init: 초기 환경 설정 및 기능 목록 생성"
fi

# 이후 실행: Coding Agent (Ralph Loop)
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo "=== Coding Agent 반복 #$ITERATION ==="

  # 완료되지 않은 기능이 있는지 확인
  REMAINING=$(jq '[.[] | select(.passes == false)] | length' specs/features.json)
  if [ "$REMAINING" -eq 0 ]; then
    echo "모든 기능 구현 완료. 루프 종료."
    break
  fi

  echo "남은 기능: $REMAINING개"
  claude --print --prompt-file PROMPT_build.md

done
\`\`\`

---

## 7. Ralph Loop 세 가지 원칙의 적용

### 원칙 1: "컨텍스트는 소모품이다"

- **적용**: 각 Coding Agent 세션은 IMPLEMENTATION_PLAN.md와 specs/features.json, git log를 읽어 스스로 컨텍스트를 재구성합니다.
- **아티팩트**: 대화 기록이 아닌 파일 시스템이 유일한 상태 저장소입니다.

### 원칙 2: "계획은 부패한다"

- **적용**: IMPLEMENTATION_PLAN.md는 매 세션 말미에 갱신합니다. 오래된 계획을 맹목적으로 따르지 않고, 현재 코드 상태와 features.json 기준으로 재우선순위화합니다.
- **아티팩트**: IMPLEMENTATION_PLAN.md의 "다음 우선 작업"은 매 커밋마다 현행화됩니다.

### 원칙 3: "지시보다 압력이 강하다"

- **적용**: "기능을 완성하라"는 지시보다, 테스트·타입체크·린트·빌드·E2E가 모두 통과해야만 커밋할 수 있다는 **검증 게이트**가 더 강한 제약입니다.
- **아티팩트**: AGENTS.md의 검증 명령이 매 반복의 통과 기준을 정의합니다.

---

## 8. 추가 고려사항: 다중 에이전트 확장

\`claude_code_longterm.md\`의 미래 연구 방향(단일 에이전트 vs. 다중 에이전트)을 Ralph Loop 구조로 확장하면:

| 에이전트 역할 | 전용 PROMPT 파일    | 담당 검증               |
| ------------- | ------------------- | ----------------------- |
| Coding Agent  | \`PROMPT_build.md\`   | 기능 구현 + 단위 테스트 |
| Testing Agent | \`PROMPT_test.md\`    | E2E 검증 + 버그 보고    |
| QA Agent      | \`PROMPT_qa.md\`      | 코드 품질 + 리팩토링    |
| Cleanup Agent | \`PROMPT_cleanup.md\` | 기술 부채 정리 + 문서화 |

각 에이전트는 동일한 loop.sh 구조 위에서 역할에 맞는 PROMPT 파일만 교체하여 운영합니다.

---

## 9. 한계 및 주의사항

두 방법론이 공통으로 인정하는 한계:

1. **나쁜 스펙 → 나쁜 결과**: specs/features.json의 품질이 전체 결과를 결정합니다. 아키텍처 설계는 여전히 인간의 판단이 필요합니다.
2. **토큰 비용**: 반복이 많아질수록 비용이 증가합니다. \`MAX_ITERATIONS\` 제한과 기능 범위 관리가 필수입니다.
3. **비전 한계**: Puppeteer 등 브라우저 자동화 도구를 사용하더라도 브라우저 네이티브 모달 등 일부 UI는 검증하기 어렵습니다.
4. **고차원 설계**: Ralph Loop는 "작은 단위 구현자"로 AI를 운영할 때 효과적이며, 전체 아키텍처 결정에는 적합하지 않습니다.

---

## 10. 한 줄 정리

> **Ralph Loop 기반 장기 에이전트 하네스**는 "Initializer가 파일 기반 환경을 설정하고, Coding Agent가 specs/features.json을 기준으로 한 번에 하나의 기능을 구현–검증–커밋하는 사이클을 loop.sh가 반복 구동하는 자율 개발 운영 방식"입니다.
\`\`\`\`

---

### File: \`.claude/loops/auto_coding_loop.md\`

If this file does not already exist, create it as an empty file.

---

### Final Step

After creating all files, run:

\`\`\`
git add CLAUDE.md .mcp.json .claude/settings.json .claude/MEMORY.md .claude/ADR.md .claude/plans/ .claude/commands/ .claude/agents/ .claude/rules/ .claude/external_knowledges/ .claude/loops/
git commit -m "chore: initialize Claude Code project harness"
\`\`\`

Do NOT stage \`CLAUDE.local.md\` or \`.claude/settings.local.json\` — they are gitignored.

Confirm to the user that initialization is complete and list all created files. Remind the user to fill in the \`## Tech Stack\`, \`## Architecture\`, and \`## Team Conventions\` sections in \`CLAUDE.md\`, or run \`/enhance-claude-md\` to have Claude fill them in automatically.

\`\`\`

\`\`\`
`;
