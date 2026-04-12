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

| 레이어 | 상태 |
|---|---|
| `src/extension.ts` | scaffold 완료 |
| `src/ui/` | 개발 예정 |
| `src/service/` | 개발 예정 |
| `src/config/` | 개발 예정 |
| `src/persistence/` | 개발 예정 |

기능 요구사항은 [`specs/features.json`](specs/features.json)에서 관리합니다. (총 34개 항목)

---

## 기술 스택

- **Language**: TypeScript 5.9.3 (`strict`, `module: Node16`, `target: ES2022`)
- **Bundler**: esbuild 0.27.3
- **Linter**: ESLint 9.39.3 + typescript-eslint 8.56.1
- **Test**: Mocha 10.0.10 + `@vscode/test-cli`

---

## 라이선스

Private — 배포 방식은 `.vsix` 파일 직접 설치
