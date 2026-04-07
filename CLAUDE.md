# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

Read `.claude/MEMORY.md` at the start of every session and treat its contents as your working memory. Update MEMORY.md at the end of each session to reflect what was accomplished, decisions made, and what comes next. Keep MEMORY.md under 200 lines at all times — summarize older entries when it approaches the limit.

## Project

이 프로젝트는 클로드 코드 하네스 엔지니어링을 쉽게하기 위한 VSCode Extension을 개발하는 프로젝트입니다. 스토어를 통한 배포가 아닌 .vsix 파일을 생성하여 배포하는 것을 최종 목적으로 합니다.

## Tech Stack

vscode extension은 typescript로 작성되어 있습니다. 이 프로젝트를 수행할 때는 vscode extension 개발 방법을 명확히 이해하고 수행하세요.

| 항목                 | 버전 / 도구                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Language             | TypeScript 5.9.3 (`strict: true`, `module: Node16`, `target: ES2022`)                     |
| Runtime              | Node.js 22.x                                                                              |
| VSCode Extension API | `@types/vscode ^1.110.0` (최소 VSCode 1.110.0 이상)                                       |
| Bundler              | esbuild 0.27.3 (`src/extension.ts` → `dist/extension.js`, CJS format)                     |
| Linter               | ESLint 9.39.3 + typescript-eslint 8.56.1                                                  |
| Test Runner          | Mocha 10.0.10 + `@vscode/test-cli ^0.0.12` + `@vscode/test-electron ^2.5.2`               |
| Build Scripts        | `npm run compile` (개발), `npm run package` (배포용 minify), `npm run watch` (watch 모드) |

## Architecture

### 레이어 다이어그램

```
VSCode Extension Host
        │
        ▼
src/extension.ts              ← 진입점. activate() 에서 명령/뷰 등록
        │
        ▼
src/ui/                       ← UI 레이어 (planned)
  WebviewPanel / TreeDataProvider / InputBox 등 VSCode UI API
  AgentSettingsView            ← 에이전트 선택 및 CLI 경로 설정 UI
        │  사용자 입력 이벤트
        ▼
src/service/                  ← 서비스 레이어 (planned)
  MarkdownConverter            ← 입력 데이터 → Markdown 변환
  AnalyzerService              ← sub-agent(Analyzer) 호출 → Command/Skill/Hook/.md 생성
  PlanService                  ← Plan 단계별 렌더링
  InitService                  ← init 프롬프트(내장) 기반 초기화 명령 전달
  AgentRunnerFactory           ← 설정된 에이전트 종류에 따라 IAgentRunner 구현체 반환
        │
        ▼  «interface» IAgentRunner
  ClaudeCodeRunner             ← Claude Code CLI (`claude`) 호출
  GeminiCliRunner              ← Gemini CLI (`gemini`) 호출  (예시)
  CustomCliRunner              ← 사용자 지정 CLI 명령 호출
        │  child_process.spawn(agentCmd, [...args])
        ▼
src/config/                   ← 설정 레이어 (planned)
  AgentConfig                  ← 선택된 에이전트 종류, CLI 실행 경로, 추가 플래그 관리
                                 (vscode.workspace.getConfiguration 또는 JSON 파일)
        │
        ▼
src/persistence/              ← 영속성 레이어 (planned)
  FileManager                  ← .md 파일 생성 / 읽기 / 수정 / 삭제 (fs/promises)
        │
        ▼
.claude/                      ← 실제 파일 시스템 (MEMORY.md, PLAN.md, 생성된 .md들)
```

### 대표 데이터 흐름 — "프로젝트 Init" 액션

1. 사용자가 WebviewPanel의 "Init" 버튼 클릭
2. `src/ui/` → `postMessage` 또는 VSCode Command 발행
3. `src/extension.ts` → 등록된 Command 핸들러 호출
4. `InitService.run()` → Extension에 내장된 init 프롬프트 문자열 로드 (`src/service/prompts/initClaudeProject.ts` 등 내장 상수로 관리, 외부 파일 의존 없음)
5. `AgentRunnerFactory.create(AgentConfig)` → 설정된 에이전트 종류에 맞는 `IAgentRunner` 구현체 반환
6. `IAgentRunner.invoke(prompt)` → `child_process.spawn(agentCmd, [...args])` 실행 (agentCmd는 설정값)
7. 선택된 CLI 에이전트가 `.claude/` 하위 파일들을 생성/수정
8. `FileManager` → 결과 파일 목록 반환
9. UI 레이어 → 완료 메시지 및 파일 목록 렌더링

### 현재 구현 vs 계획 상태

| 경로                         | 상태                  | 역할                                                                           |
| ---------------------------- | --------------------- | ------------------------------------------------------------------------------ |
| `src/extension.ts`           | **구현됨** (scaffold) | 진입점. `activate()` / `deactivate()`                                          |
| `src/test/extension.test.ts` | **구현됨** (scaffold) | Extension 기본 테스트                                                          |
| `src/ui/`                    | **(planned)**         | WebviewPanel 등 VSCode UI 컴포넌트                                             |
| `src/service/`               | **(planned)**         | MarkdownConverter, AnalyzerService, PlanService, InitService, AgentRunnerFactory + IAgentRunner 구현체들 |
| `src/config/`                | **(planned)**         | AgentConfig — 에이전트 종류·CLI 경로·플래그 설정 관리                          |
| `src/persistence/`           | **(planned)**         | FileManager (fs/promises 기반 .md 파일 CRUD)                                   |
| `dist/extension.js`          | 자동 생성 (esbuild)   | 배포용 번들 — 직접 수정 금지                                                   |

### 주요 파일

| 파일                                    | 역할                                                             |
| --------------------------------------- | ---------------------------------------------------------------- |
| `src/extension.ts`                      | Extension 진입점. 모든 Command/View를 `activate()`에서 등록      |
| `package.json`                          | Extension 메타데이터, `contributes.commands` 선언, 빌드 스크립트 |
| `esbuild.js`                            | `src/extension.ts` → `dist/extension.js` 번들링 설정             |
| `tsconfig.json`                         | TypeScript 컴파일 설정 (strict, Node16, ES2022)                  |
| `eslint.config.mjs`                     | ESLint 규칙 (typescript-eslint 기반)                             |
| `.claude/commands/enhance_claude_md.md`   | `/enhance-claude-md` 슬래시 커맨드 정의                                              |
| `src/service/prompts/` (planned)          | Extension에 내장된 프롬프트 상수 모음 (init 등). 외부 파일 의존 없이 번들에 포함됨  |

### VSCode Extension 브릿지 포인트

- **명령 등록**: `package.json#contributes.commands` + `vscode.commands.registerCommand()`
- **UI 컴포넌트**: 구현 시 `vscode.window.createWebviewPanel()` (복잡한 UI) 또는 `vscode.window.createTreeView()` (트리) 선택
- **CLI 에이전트 호출**: `IAgentRunner` 인터페이스로 추상화. `AgentRunnerFactory`가 설정에 따라 `ClaudeCodeRunner` / `GeminiCliRunner` / `CustomCliRunner` 중 하나를 반환. 실제 실행은 Node.js `child_process.spawn(agentCmd, args)`
- **에이전트 설정**: `vscode.workspace.getConfiguration('agentHarness')` 또는 프로젝트 루트의 설정 JSON 파일로 에이전트 종류(`agentType`), CLI 실행 경로(`cliPath`), 추가 플래그(`extraArgs`) 관리
- **파일 I/O**: `vscode.workspace.fs` (VSCode 가상 파일시스템 호환) 또는 Node.js `fs/promises`

## Team Conventions

커밋 메세지 컨벤션 : 이 커밋 메세지는 클로드 코드가 git 명령어를 통해 조회하여 이전 작업 내역을 알 수 있어야 하므로 최대한 상세하게 작성하세요.
title, change, purpose 등 어떤 변화가 생겼고, 왜 생겼는지 등을 기록하면 좋습니다.

코드는 반드시 클린 코드 원칙을 지키고, OOP에 기반하여 작성하세요.
주석은 한글로 작성하고 가능한 세부적으로 주석을 달아야 합니다.

### ESLint 규칙 (eslint.config.mjs)

- `@typescript-eslint/naming-convention`: import 식별자는 반드시 camelCase 또는 PascalCase
- `curly`: 모든 제어 흐름(`if`/`for`/`while`)에 중괄호 필수
- `eqeqeq`: `==` 대신 `===` 사용
- `no-throw-literal`: `throw`는 반드시 Error 객체만 던질 것
- `semi`: 세미콜론 필수 (모두 warn 수준 — CI에서는 `npm run lint` 통과 필요)

### TypeScript 규칙

- `strict: true` 필수 — 암묵적 any, null 미체크 금지
- `module: Node16` — ESM/CJS 혼용 시 `.js` 확장자를 import 경로에 명시
- `npm run check-types`가 통과해야 커밋 가능

### 빌드 / 배포

- 개발 중: `npm run watch` (esbuild watch + tsc type-check watch 병렬 실행)
- 타입 검사 + lint + 번들: `npm run compile`
- `.vsix` 패키징: `npm run package` → vsce로 패키지 생성
- 빌드 결과물 `dist/`는 절대 직접 수정하지 말 것

### 테스트

- 테스트 파일 위치: `src/test/`
- 실행: `npm test` (`vscode-test` runner 사용)
- 테스트는 실제 VSCode Extension Host 환경에서 실행되므로 `vscode` API 사용 가능

## Key Rules

Plan mode나 실행 계획을 저장하는 경우 반드시 전역 폴더가 아닌 현재 프로젝트의 .claude/plans/PLAN.md에 기록하며, 이 파일에 기록되어 있는 작성 규범 등은 사라지지 않도록 유지하세요.
무언가 실행해야 하는 경우, plan에 따라 실행하라는 명령을 내리면 반드시 .claude/plans/PLAN.md에 따라서 수행해주세요.
어떤 작업이든 수행하고 난 다음에는 반드시 .claude/MEMORY.md 파일을 갱신하여 항상 최신 메모리를 유지하세요.
어떤 작업이든 수행하기 전에는 .claude/MEMORY.md 파일의 기억을 참고하세요.

### VSCode Extension 필수 규칙

- `activate(context)` 함수 내에서 등록한 모든 disposable은 반드시 `context.subscriptions.push(...)` 해야 함 — 누락 시 메모리 누수 발생
- `package.json`의 `contributes.commands`에 선언된 명령 ID와 `vscode.commands.registerCommand(...)` 첫 번째 인자가 반드시 일치해야 함
- `vscode` 모듈은 외부 의존성(`external: ['vscode']`)으로 처리되므로 절대 번들에 포함하지 말 것 — `import * as vscode from 'vscode'`만 사용
- `dist/` 디렉토리는 esbuild가 자동 생성하므로 직접 편집 금지
- 새 명령 추가 시 반드시 `package.json#contributes.commands`와 `activate()` 양쪽 모두 수정할 것
- Extension의 활성화 시점은 `activationEvents` 배열로 제어 — 현재는 빈 배열(자동 감지). 명시적 이벤트가 필요하면 추가할 것

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
