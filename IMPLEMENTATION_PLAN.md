# IMPLEMENTATION_PLAN.md

## 현재 상태 (마지막 업데이트: 2026-04-12)

- 완료된 기능: 0개 / 전체 34개
- 마지막 커밋: 304b067 feat(harness): Ralph Loop 커맨드 체계 정비 및 외부 지식 문서 추가

## 다음 우선 작업

아래 항목을 이 순서대로 구현합니다.
레이어 의존성 기준: 인프라 → UI 진입점 → 서비스 → 영속성 → 완성 기능

- [ ] F-001: Extension activates when a workspace is opened in VSCode (category: infrastructure)
- [ ] F-002: Extension deactivates cleanly and releases all disposables (category: infrastructure)
- [ ] F-028: TypeScript compilation passes with no type errors (category: infrastructure)
- [ ] F-029: ESLint passes with no lint errors on the src/ directory (category: infrastructure)
- [ ] F-030: esbuild가 src/extension.ts를 dist/extension.js로 오류 없이 번들링한다 (category: infrastructure, priority: 1)
- [ ] F-031: npm test (Mocha + @vscode/test-cli)가 오류 없이 통과된다 (category: infrastructure, priority: 2)
- [ ] F-003: Extension can be packaged as a .vsix file (category: infrastructure)
- [ ] F-004: Main panel opens when the extension's primary command is executed (category: functional)
- [ ] F-032: 이미 열린 메인 패널이 있을 때 명령을 재실행하면 새 패널이 열리지 않고 기존 패널이 포커스된다 (category: functional, priority: 3)
- [ ] F-005: User can input project requirement data through the main panel form (category: functional)
- [ ] F-014: User can select the CLI agent type in settings (category: functional)
- [ ] F-015: User can set the CLI executable path in agent settings (category: functional)
- [ ] F-016: User can set extra CLI flags in agent settings (category: functional)
- [ ] F-027: Agent settings are persisted across VSCode sessions (category: functional)
- [ ] F-006: User input data is converted to Markdown format for agent consumption (category: functional)
- [ ] F-017: AgentRunnerFactory returns ClaudeCodeRunner when agentType is 'claude' (category: functional)
- [ ] F-018: AgentRunnerFactory returns GeminiCliRunner when agentType is 'gemini' (category: functional)
- [ ] F-019: AgentRunnerFactory returns CustomCliRunner when agentType is 'custom' (category: functional)
- [ ] F-020: CLI agent stdout and stderr output is streamed and displayed in the UI (category: functional)
- [ ] F-033: 에이전트 CLI 프로세스가 오류 코드로 종료되면 UI에 오류 메시지와 종료 코드가 표시된다 (category: functional, priority: 4)
- [ ] F-034: 사용자가 UI에서 실행 중인 에이전트 프로세스를 취소할 수 있다 (category: functional, priority: 3)
- [ ] F-007: Init Project button triggers project initialization via the configured CLI agent (category: functional)
- [ ] F-008: AnalyzerService generates a Command markdown file at .claude/commands/ (category: functional)
- [ ] F-009: AnalyzerService generates a Skill markdown file (category: functional)
- [ ] F-010: AnalyzerService generates an MCP server spec file (category: functional)
- [ ] F-011: AnalyzerService generates a hook configuration entry (category: functional)
- [ ] F-012: AnalyzerService generates a sub-agent markdown file at .claude/agents/ (category: functional)
- [ ] F-013: Plan view renders the current PLAN.md content as a readable stepped list (category: functional)
- [ ] F-021: FileManager creates a new .md file at a specified path (category: functional)
- [ ] F-022: FileManager reads a .md file from a specified path (category: functional)
- [ ] F-023: FileManager updates (overwrites) a .md file at a specified path (category: functional)
- [ ] F-024: FileManager deletes a .md file at a specified path (category: functional)
- [ ] F-025: FileManager lists all .md files in a specified directory (category: functional)
- [ ] F-026: UI displays the list of files created or modified after an agent action completes (category: functional)

## 구현 순서 가이드

레이어 의존성 기준으로 아래 순서를 따릅니다:

```
1단계: 인프라 기반 확립 (F-001, F-002, F-028, F-029, F-030, F-031, F-003)
   └─ activate/deactivate 정상 동작, tsc/lint/esbuild/test 통과, .vsix 패키징

2단계: UI 진입점 (F-004, F-032)
   └─ WebviewPanel 생성 및 중복 방지 로직

3단계: 설정 레이어 (F-005, F-014, F-015, F-016, F-027)
   └─ AgentConfig, AgentSettingsView, 설정 영속성

4단계: 서비스 코어 (F-006, F-017, F-018, F-019, F-020, F-033, F-034)
   └─ MarkdownConverter, AgentRunnerFactory + IAgentRunner 구현체, 스트리밍, 에러/취소

5단계: 주요 기능 (F-007, F-008~F-012, F-013)
   └─ InitService, AnalyzerService, PlanService

6단계: 영속성 레이어 (F-021~F-025) + UI 완성 (F-026)
   └─ FileManager, 결과 파일 목록 렌더링
```

## 알려진 이슈 / 기술 부채

- (없음 — 구현 시작 전)

## 세션 로그

### 2026-04-12 — configure_loop 실행

- Ralph Loop 하네스 환경 초기 설정 완료
- 생성된 파일: AGENTS.md, IMPLEMENTATION_PLAN.md, PROMPT_plan.md, PROMPT_build.md, loop.sh
- specs/features.json: 34개 항목 전체 passes: false (구현 미시작)
- 현재 src/extension.ts에는 scaffold 수준의 helloWorld 커맨드만 존재
