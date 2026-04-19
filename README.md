# Agent Harness Framework

> VSCode Extension for Claude Code harness engineering — design your AI agent environment visually and initialize it in one click.

---

## 개요

**Agent Harness Framework**는 Claude Code(및 기타 CLI 에이전트) 기반 개발 환경을 손쉽게 구성할 수 있도록 돕는 VSCode Extension입니다.

개발자가 프로젝트 요구사항을 입력하면, Extension이 이를 분석하여 `.claude/` 하네스 파일들(Command, Skill, Hook, MCP 설정, Sub-agent 정의)을 자동으로 생성합니다.
CLI 에이전트는 Claude Code 외에도 Gemini CLI, 사용자 지정 CLI를 선택할 수 있습니다.

배포는 VSCode Marketplace 스토어가 아닌 `.vsix` 파일을 통해 이루어집니다.

---

## 주요 기능

| 기능 | 설명 |
|---|---|
| **프로젝트 Init** | 내장 프롬프트를 CLI 에이전트에 전달하여 `.claude/` 하네스 구조를 자동 생성 |
| **Analyzer** | 사용자 입력을 분석해 Command / Skill / Hook / MCP / Sub-agent .md 파일 생성 |
| **Plan View** | `.claude/plans/PLAN.md` 내용을 단계별 체크리스트로 시각화 |
| **에이전트 설정** | Claude Code / Gemini CLI / Custom CLI 중 선택, CLI 경로 및 추가 플래그 설정 |
| **Markdown 변환** | 사용자 입력 데이터를 CLI 에이전트에 최적화된 Markdown 형식으로 변환 |
| **파일 결과 표시** | 에이전트 실행 후 생성/수정된 파일 목록을 패널에 표시 |

---

## 아키텍처

```
VSCode Extension Host
        │
        ▼
src/extension.ts          ← 진입점 (activate / deactivate)
        │
        ▼
src/ui/                   ← WebviewPanel, AgentSettingsView
        │
        ▼
src/service/              ← MarkdownConverter, AnalyzerService,
                             PlanService, InitService,
                             AgentRunnerFactory + IAgentRunner 구현체
        │
        ▼
src/config/               ← AgentConfig (에이전트 종류·경로·플래그)
        │
        ▼
src/persistence/          ← FileManager (.md CRUD)
        │
        ▼
.claude/                  ← 실제 파일 시스템 (하네스 파일들)
```

CLI 에이전트 호출은 `IAgentRunner` 인터페이스로 추상화되어 있으며, `AgentRunnerFactory`가 설정에 따라 적절한 구현체를 반환합니다.

---

## 요구사항

- **VSCode** 1.110.0 이상
- **Node.js** 22.x
- 사용할 CLI 에이전트 (기본: [Claude Code](https://claude.ai/code)) 가 PATH에 설치되어 있어야 합니다.

---

## 설치 (개발 중)

현재 개발 단계입니다. 완성 후 `.vsix` 파일로 배포됩니다.

```bash
# 의존성 설치
npm install

# 개발 모드 (watch)
npm run watch

# 빌드 (타입 검사 + lint + 번들)
npm run compile

# .vsix 패키지 생성
npm run package
```

생성된 `.vsix` 파일은 VSCode에서 **Extensions → Install from VSIX...** 메뉴로 설치합니다.

---

## 개발 현황

> 최종 업데이트: 2026-04-19

### MVP 달성: ✅ 완료

Extension 설치 → CLI 에이전트 설정 → Init Project 버튼 클릭 → CLI 실행 → 완료 피드백까지의 핵심 흐름이 완전히 동작합니다.

### 기능 구현 현황 (22 / 34)

| 레이어 | 파일 | 상태 |
|--------|------|------|
| 진입점 | `src/extension.ts` | ✅ 완료 |
| UI | `src/ui/MainPanel.ts` | ✅ 완료 |
| UI | `src/ui/AgentSettingsView.ts` | ✅ 완료 |
| UI | `src/ui/PlanView.ts` | 🔲 미구현 |
| 서비스 | `src/service/InitService.ts` | ✅ 완료 |
| 서비스 | `src/service/MarkdownConverter.ts` | ✅ 완료 |
| 서비스 | `src/service/AgentRunnerFactory.ts` | ✅ 완료 |
| 서비스 | `src/service/ClaudeCodeRunner.ts` | ✅ 완료 |
| 서비스 | `src/service/GeminiCliRunner.ts` | ✅ 완료 |
| 서비스 | `src/service/CustomCliRunner.ts` | ✅ 완료 |
| 서비스 | `src/service/AnalyzerService.ts` | 🔲 미구현 |
| 설정 | `src/config/AgentConfig.ts` | ✅ 완료 |
| 영속성 | `src/persistence/FileManager.ts` | 🔲 미구현 |

### 완료된 기능 요약 (passes=true)

- **인프라**: Extension 활성화·비활성화, .vsix 패키징, TypeScript 컴파일, ESLint, esbuild 번들링, 테스트 (F-001~F-003, F-028~F-031)
- **UI**: 메인 패널 열기 및 싱글톤 포커스, 요구사항 입력 폼, Markdown 변환 버튼 (F-004~F-006, F-032)
- **에이전트 설정**: 에이전트 타입 선택(claude/gemini/custom), CLI 경로 설정, 추가 플래그 설정, 세션 간 영속성 (F-014~F-016, F-027)
- **CLI 실행**: AgentRunnerFactory 3종 Runner, stdout/stderr 실시간 스트리밍, Init Project 전체 흐름, 오류 표시, 취소 버튼 (F-007, F-017~F-020, F-033~F-034)

### 다음 구현 예정

1. `src/persistence/FileManager.ts` — .md 파일 CRUD (F-021~F-025)
2. `src/service/AnalyzerService.ts` — Command / Skill / Hook / MCP / Sub-agent 파일 생성 (F-008~F-012)
3. `src/ui/PlanView.ts` — PLAN.md 단계별 렌더링 (F-013)

기능 요구사항 전체 목록: [`specs/features.json`](specs/features.json) (총 34개 항목)

---

## 기술 스택

- **Language**: TypeScript 5.9.3 (`strict`, `module: Node16`, `target: ES2022`)
- **Bundler**: esbuild 0.27.3
- **Linter**: ESLint 9.39.3 + typescript-eslint 8.56.1
- **Test**: Mocha 10.0.10 + `@vscode/test-cli`

---

## 라이선스

Private — 배포 방식은 `.vsix` 파일 직접 설치
