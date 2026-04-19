# IMPLEMENTATION_PLAN.md

## 현재 상태 (마지막 업데이트: 2026-04-20)

- 완료된 기능: 23개 / 전체 34개 (F-001, F-002, F-003, F-004, F-005, F-006, F-007, F-014, F-015, F-016, F-017, F-018, F-019, F-020, F-021, F-027, F-028, F-029, F-030, F-031, F-032, F-033, F-034)
- 마지막 커밋: fc4ad2c feat(F-021): FileManager.create()로 지정 경로에 .md 파일 생성

## 다음 우선 작업

아래 항목을 이 순서대로 구현합니다.
레이어 의존성 기준: 인프라 → UI 진입점 → 서비스 → 영속성 → 완성 기능

- [x] F-001: Extension activates when a workspace is opened in VSCode (category: infrastructure) — 50e9d0c
- [x] F-002: Extension deactivates cleanly and releases all disposables (category: infrastructure) — 50e9d0c
- [x] F-028: TypeScript compilation passes with no type errors (category: infrastructure) — 50e9d0c
- [x] F-029: ESLint passes with no lint errors on the src/ directory (category: infrastructure) — 50e9d0c
- [x] F-030: esbuild가 src/extension.ts를 dist/extension.js로 오류 없이 번들링한다 (category: infrastructure, priority: 1) — 50e9d0c
- [x] F-031: npm test (Mocha + @vscode/test-cli)가 오류 없이 통과된다 (category: infrastructure, priority: 2) — 50e9d0c
- [x] F-003: Extension can be packaged as a .vsix file (category: infrastructure) — 1dbfc87
- [x] F-004: Main panel opens when the extension's primary command is executed (category: functional) — 14d81a5
- [x] F-032: 이미 열린 메인 패널이 있을 때 명령을 재실행하면 새 패널이 열리지 않고 기존 패널이 포커스된다 (category: functional, priority: 3) — 27f6313
- [x] F-005: User can input project requirement data through the main panel form (category: functional) — fa0d125
- [x] F-014: User can select the CLI agent type in settings (category: functional) — d755581
- [x] F-015: User can set the CLI executable path in agent settings (category: functional) — 965745e
- [x] F-016: User can set extra CLI flags in agent settings (category: functional) — b4913fa
- [x] F-027: Agent settings are persisted across VSCode sessions (category: functional) — 379290d
- [x] F-006: User input data is converted to Markdown format for agent consumption (category: functional) — c185362
- [x] F-017: AgentRunnerFactory returns ClaudeCodeRunner when agentType is 'claude' (category: functional) — d75fc59
- [x] F-018: AgentRunnerFactory returns GeminiCliRunner when agentType is 'gemini' (category: functional) — 7e082ff
- [x] F-019: AgentRunnerFactory returns CustomCliRunner when agentType is 'custom' (category: functional) — 827a5be
- [x] F-020: CLI agent stdout and stderr output is streamed and displayed in the UI (category: functional) — eeb417d
- [x] F-033: 에이전트 CLI 프로세스가 오류 코드로 종료되면 UI에 오류 메시지와 종료 코드가 표시된다 (category: functional, priority: 4) — 75c1fa6
- [x] F-034: 사용자가 UI에서 실행 중인 에이전트 프로세스를 취소할 수 있다 (category: functional, priority: 3) — 5262136
- [x] F-007: Init Project button triggers project initialization via the configured CLI agent (category: functional) — 5e4e038
- [ ] F-008: AnalyzerService generates a Command markdown file at .claude/commands/ (category: functional)
- [ ] F-009: AnalyzerService generates a Skill markdown file (category: functional)
- [ ] F-010: AnalyzerService generates an MCP server spec file (category: functional)
- [ ] F-011: AnalyzerService generates a hook configuration entry (category: functional)
- [ ] F-012: AnalyzerService generates a sub-agent markdown file at .claude/agents/ (category: functional)
- [ ] F-013: Plan view renders the current PLAN.md content as a readable stepped list (category: functional)
- [x] F-021: FileManager creates a new .md file at a specified path (category: functional) — fc4ad2c
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

### 2026-04-20 — Ralph Loop 세션 17 (Coding Agent)

- F-021: FileManager.create()로 지정 경로에 .md 파일 생성
  - src/persistence/FileManager.ts 신규 생성 — vscode.workspace.fs 기반 FileManager 클래스
    - create(): 부모 디렉토리 존재 확인 후 UTF-8 파일 신규 생성
    - read/update/delete/list 메서드 스텁 구현 (F-022~F-025 대비)
  - src/extension.ts: FileManager import 및 ExtensionApi 노출 추가
  - src/test/extension.test.ts: F-021 테스트 2건 추가 (파일 생성·내용 일치, 부모없음→Error)
  - 35 passing (기존 33 + F-021 2건)

### 2026-04-14 — Ralph Loop 세션 16 (Coding Agent)

- F-007: Init Project 버튼 클릭 시 CLI 에이전트를 통한 프로젝트 초기화 기능 구현
  - src/service/prompts/initClaudeProject.ts 신규 생성 — vibe_context/init-claude-project.md를 TypeScript 상수로 번들에 내장
  - src/service/InitService.ts 신규 생성 — IAgentRunner DI, 내장 프롬프트로 invoke(), .claude/ 재귀 스캔 후 InitResult 반환
  - src/ui/MainPanel.ts: InitRequestedMessage 타입, init-project-btn 버튼, #success-message 영역, showSuccess()/setOnInitRequested() 메서드 추가
  - src/extension.ts: InitService import, ExtensionApi 노출, openMainPanel 핸들러에 setOnInitRequested 콜백 등록
  - src/test/extension.test.ts: F-007 테스트 2건 추가 (HTML 버튼 검증, initRequested→isRunning 검증)
  - 33 passing (기존 31 + F-007 2건)

### 2026-04-13 — Ralph Loop 세션 15 (Coding Agent)

- F-033: 에이전트 CLI 오류 종료 시 UI 오류 메시지 표시 기능 구현
  - src/ui/MainPanel.ts: _errorMessage 필드, showError()/getErrorMessageForTest() 정적 메서드 추가
  - src/ui/MainPanel.ts: setRunning(true) 시 _errorMessage 초기화, #error-message HTML div 추가 (붉은 오류 스타일)
  - src/test/extension.test.ts: F-033 테스트 2건 추가 (showError() HTML 표시, invoke() reject 종료 코드 검증)
  - 31 passing (기존 29 + F-033 2건)

### 2026-04-13 — Ralph Loop 세션 14 (Coding Agent)

- F-020: CLI 에이전트 stdout/stderr 실시간 스트리밍 및 UI 표시 구현
  - src/service/IAgentRunner.ts: invoke() 시그니처에 onStdout/onStderr 선택적 콜백 추가
  - src/service/ClaudeCodeRunner.ts: child.stdout/stderr 'data' 이벤트로 콜백 호출
  - src/service/GeminiCliRunner.ts: 동일 패턴 구현
  - src/service/CustomCliRunner.ts: 동일 패턴 구현
  - src/ui/MainPanel.ts: #output-area div, .stderr-text 스타일, appendOutput()/getOutputForTest()/clearOutputForTest() 정적 메서드, 웹뷰 스크립트에 appendOutput 메시지 핸들러 추가
  - src/test/extension.test.ts: F-020 테스트 2건 추가
  - 29 passing (기존 27 + F-020 2건)

### 2026-04-13 — Ralph Loop 세션 13 (Coding Agent)

- F-034: 실행 중인 에이전트 프로세스 취소 기능 구현
  - src/service/IAgentRunner.ts: cancel()/isRunning() 인터페이스 메서드 추가
  - src/service/ClaudeCodeRunner.ts: _childProcess/_isRunning 추적, cancel()/isRunning() 구현
  - src/service/GeminiCliRunner.ts: 동일 패턴으로 cancel()/isRunning() 구현
  - src/service/CustomCliRunner.ts: 동일 패턴으로 cancel()/isRunning() 구현
  - src/ui/MainPanel.ts: CancelRequestedMessage 타입, setRunning()/isRunningForTest()/getStatusMessageForTest() 정적 메서드, HTML에 취소 버튼 및 상태 메시지 영역 추가
  - src/test/extension.test.ts: F-034 테스트 2건 추가
  - 27 passing (기존 25 + F-034 2건)

### 2026-04-12 — configure_loop 실행

- Ralph Loop 하네스 환경 초기 설정 완료
- 생성된 파일: AGENTS.md, IMPLEMENTATION_PLAN.md, PROMPT_plan.md, PROMPT_build.md, loop.sh
- specs/features.json: 34개 항목 전체 passes: false (구현 미시작)
- 현재 src/extension.ts에는 scaffold 수준의 helloWorld 커맨드만 존재

### 2026-04-13 — Ralph Loop 세션 12 (Coding Agent)

- F-019: AgentRunnerFactory + CustomCliRunner 구현
  - src/service/CustomCliRunner.ts 신규 생성 — IAgentRunner 구현체, cliPath 그대로 spawn 명령으로 사용 (기본값 없음)
  - src/service/AgentRunnerFactory.ts — 'custom' 케이스 TODO throw 제거, CustomCliRunner 반환으로 교체
  - src/extension.ts — ExtensionApi에 CustomCliRunner 추가
  - src/test/extension.test.ts — F-019 테스트 2건 추가 (cliPath 설정 검증, 빈 문자열 처리 검증)
  - 25 passing (기존 23 + F-019 2건)

### 2026-04-13 — Ralph Loop 세션 11 (Coding Agent)

- F-018: AgentRunnerFactory + GeminiCliRunner 구현
  - src/service/GeminiCliRunner.ts 신규 생성 — IAgentRunner 구현체, child_process.spawn('gemini',...) 호출
  - src/service/AgentRunnerFactory.ts — 'gemini' 케이스에서 GeminiCliRunner 반환으로 교체
  - src/extension.ts — ExtensionApi에 GeminiCliRunner 추가
  - src/test/extension.test.ts — F-018 테스트 2건 추가 (instanceof 검증, cliPath 기본값/'gemini', 사용자 지정 경로)
  - 23 passing (기존 21 + F-018 2건)

### 2026-04-13 — Ralph Loop 세션 10 (Coding Agent)

- F-017: AgentRunnerFactory + ClaudeCodeRunner 구현
  - src/service/IAgentRunner.ts 신규 생성 — invoke(prompt)/getSpawnCommand() 인터페이스
  - src/service/ClaudeCodeRunner.ts 신규 생성 — IAgentRunner 구현체, child_process.spawn('claude',...) 호출
  - src/service/AgentRunnerFactory.ts 신규 생성 — AgentConfig 기반 팩토리, 'claude' → ClaudeCodeRunner
  - src/extension.ts — ExtensionApi에 AgentRunnerFactory, ClaudeCodeRunner 추가
  - src/test/extension.test.ts — F-017 테스트 2건 추가 (instanceof 검증, cliPath 빈 값 → 'claude', cliPath 지정 값 검증)
  - .vscode-test.mjs — Mocha timeout 2000ms → 10000ms (디스크 I/O 통합 테스트 안정화)
  - 21 passing (기존 20 + F-017 2건에서, 실제로는 두 F-017 테스트를 추가했지만 19→21)

### 2026-04-13 — Ralph Loop 세션 9 (Coding Agent)

- F-006: 사용자 입력 데이터 Markdown 변환 기능 구현
  - src/service/MarkdownConverter.ts 신규 생성 — 순수 TypeScript 서비스 클래스 (VSCode API 미의존)
  - src/ui/MainPanel.ts — WebviewMessage 유니온 타입 확장 (ConvertRequestedMessage 추가), _markdownValue 필드, getMarkdownValue() 정적 메서드, convertRequested 메시지 처리, HTML에 convert-to-markdown-btn 버튼 추가
  - src/test/extension.test.ts — F-006 테스트 2건 추가, F-005 inputChanged 테스트에 상태 초기화 추가
  - 19 passing (기존 17 + F-006 2건 추가)

### 2026-04-13 — Ralph Loop 세션 8 (Coding Agent)

- F-027: 에이전트 설정 VSCode 세션 간 영속성 검증
  - src/ui/AgentSettingsView.ts: disposeForTest() 정적 메서드 추가 (패널 강제 닫기, 재시작 시뮬레이션용)
  - src/test/extension.test.ts: F-027 테스트 2건 추가
    - agentType=gemini 저장 → 패널 닫기 → 재오픈 → HTML에 gemini selected 확인
    - cliPath, extraArgs 저장 → 패널 닫기 → 재오픈 → HTML에 값 반영 확인
  - AgentConfig는 이미 ConfigurationTarget.Global로 저장 중이므로 영속성 로직 신규 구현 없음
  - 17 passing (기존 15 + F-027 2건 추가)

### 2026-04-13 — Ralph Loop 세션 7 (Coding Agent)

- F-016: 추가 CLI 플래그 설정 UI 구현
  - src/config/AgentConfig.ts: KEY_EXTRA_ARGS, DEFAULT_EXTRA_ARGS 상수 추가, getExtraArgs()/setExtraArgs() 메서드 추가
  - src/ui/AgentSettingsView.ts: AgentSettingsExtraArgsMessage 인터페이스 추가, AgentSettingsMessage 유니온 타입 확장, _extraArgs 필드, getExtraArgs() 정적 메서드, _processMessage에 setExtraArgs 처리, HTML에 id="extra-args-input" textarea, 웹뷰 스크립트에 input 이벤트 핸들러 추가
  - package.json: agentHarness.extraArgs 설정 스키마 추가
  - src/test/extension.test.ts: F-016 테스트 2건 추가
  - 15 passing (F-001×2, F-002×1, F-004×2, F-032×1, F-005×2, F-014×3, F-015×2, F-016×2)

### 2026-04-13 — Ralph Loop 세션 6 (Coding Agent)

- F-015: CLI 실행 경로 설정 UI 구현
  - src/config/AgentConfig.ts: KEY_CLI_PATH, DEFAULT_CLI_PATH 상수 추가, getCliPath()/setCliPath() 메서드 추가
  - src/ui/AgentSettingsView.ts: AgentSettingsMessage 유니온 타입 확장(setCliPath 추가), _cliPath 필드, getCliPath() 정적 메서드, _processMessage에 setCliPath 처리, HTML에 id="cli-path-input" 입력 필드, _escapeHtml() 보안 메서드 추가
  - package.json: agentHarness.cliPath 설정 스키마 추가
  - src/test/extension.test.ts: F-015 테스트 2건 추가
  - 13 passing (F-001×2, F-002×1, F-004×2, F-032×1, F-005×2, F-014×3, F-015×2)

### 2026-04-13 — Ralph Loop 세션 5 (Coding Agent)

- F-014: 에이전트 타입 선택 설정 UI 구현
  - src/config/AgentConfig.ts 신규 생성 — AgentType 타입 정의, AgentConfig 클래스 (getAgentType/setAgentType)
  - src/ui/AgentSettingsView.ts 신규 생성 — WebviewPanel 기반 설정 뷰 (싱글톤, 드롭다운 UI, setAgentType 메시지 처리)
  - src/extension.ts — openAgentSettings 명령 등록, ExtensionApi에 AgentSettingsView 추가
  - package.json — openAgentSettings 명령 및 agentHarness.agentType 설정 스키마 추가
  - src/test/extension.test.ts: F-014 테스트 3건 추가 (명령 등록, 드롭다운 HTML, 타입별 저장 검증)
  - 11 passing (F-001×2, F-002×1, F-004×2, F-032×1, F-005×2, F-014×3)

### 2026-04-13 — Ralph Loop 세션 4 (Coding Agent)

- F-005: 메인 패널 프로젝트 요구사항 입력 폼 구현
  - src/ui/MainPanel.ts: WebviewMessage 인터페이스, _inputValue 필드, onDidReceiveMessage 핸들러, _processMessage() 추가
  - src/ui/MainPanel.ts: getInputValue(), simulateWebviewMessage(), getHtmlForTest() 정적 메서드 추가
  - HTML에 id="requirement-input" textarea 폼 추가, 웹뷰 스크립트에서 input 이벤트 시 postMessage() 호출
  - src/test/extension.test.ts: F-005 테스트 2건 추가 (textarea 존재 검증, 메시지 저장 검증)
  - 8 passing (F-001×2, F-002×1, F-004×2, F-032×1, F-005×2)

### 2026-04-13 — Ralph Loop 세션 3 (Coding Agent)

- F-032: 메인 패널 중복 생성 방지 — 재실행 시 기존 패널 포커스
  - src/ui/MainPanel.ts: `MainPanel.isOpen()` 정적 메서드 추가 (테스트용 싱글톤 상태 노출)
  - src/extension.ts: `ExtensionApi` 인터페이스 정의 + `activate()` 반환 타입 변경 (void → ExtensionApi), MainPanel 클래스 참조 반환
  - src/test/extension.test.ts: F-032 테스트 케이스 추가 — ext.exports.MainPanel을 통해 싱글톤 상태 검증
  - 6 passing (F-001×2, F-002×1, F-004×2, F-032×1)

### 2026-04-13 — Ralph Loop 세션 2 (Coding Agent)

- F-004: src/ui/MainPanel.ts 신규 생성 — WebviewPanel 라이프사이클 관리 클래스 (CSP nonce, 싱글톤 패턴)
  - package.json에 agent-harness-framework.openMainPanel 명령 추가
  - src/extension.ts에 openMainPanel 명령 등록 및 subscriptions.push()
  - src/test/extension.test.ts에 F-004 테스트 2건 추가
  - 5 passing (F-001×2, F-002×1, F-004×2)

### 2026-04-13 — Ralph Loop 세션 1 (Coding Agent)

- F-001, F-002: 이미 50e9d0c에서 구현된 activate/deactivate features.json 반영 (passes=true)
- F-028, F-029, F-030, F-031: 인프라 검증 게이트 이미 통과 중 — features.json 반영
- F-003: `@vscode/vsce` 추가, package.json 구조 재편 (vscode:prepublish 분리, package 스크립트 업데이트)
  - npm run package → agent-harness-framework-0.0.1.vsix 생성 확인
  - publisher: "undefined-publisher", repository URL 추가
  - README.md 링크 수정 (develop_references → specs)
