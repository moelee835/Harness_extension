# MEMORY.md

Claude Code의 작업 메모리 파일입니다. 세션이 시작될 때 읽고, 세션이 끝날 때 업데이트하세요.
이 파일은 사용자가 수정하지 않습니다. Claude Code가 스스로 기록하고 관리합니다.
200줄 제한을 항상 유지하세요. 오래된 항목은 요약하여 압축하세요.

## Current State

- Project initialized: 2026-04-07
- Last session: 2026-04-07
- Status: Claude Code 하네스 초기화 완료, CLAUDE.md 프로젝트 정보 작성 완료
- GitHub remote: https://github.com/moelee835/Harness_extension.git (main 브랜치)

## Recent Decisions

- **GitHub 리포지토리 변경**: 기존 `vibe-coding-harnetss-framework` → `Harness_extension`으로 origin 재설정
- **하네스 구조 확정**: `.claude/` 하위에 MEMORY.md, settings.json, plans/PLAN.md, commands/, agents/, rules/ 배치
- **배포 방식**: VSCode 마켓플레이스 스토어 배포 없이 `.vsix` 파일 생성 후 배포
- **CLI 에이전트 추상화**: Claude Code 전용 Runner → `IAgentRunner` 인터페이스 + `AgentRunnerFactory` 패턴으로 설계. 사용자가 Extension 설정에서 에이전트 종류(Claude Code / Gemini CLI / 사용자 지정) 및 CLI 경로를 지정 가능
- **init 프롬프트 내장**: `vibe_context/init-claude-project.md` 파일 읽기 방식 폐기 → `src/service/prompts/` 내 TypeScript 상수로 번들에 포함

## Project Overview (CLAUDE.md 요약)

- **목적**: Claude Code 하네스 엔지니어링을 쉽게 하기 위한 VSCode Extension 개발
- **Tech Stack**: TypeScript (VSCode Extension)
- **Architecture**: `src/ui` → `src/service` → `files`
  - UI 레이어: 사용자 입력/클릭 반응형 UI
  - Service 레이어: markdown 변환, sub-agent(Analyzer) 호출, plan 출력, init 명령 전달, Claude Code 호출
  - 영속성 레이어: DB 없이 .md 파일만 생성/수정/삭제
- **커밋 규칙**: title + change + purpose를 상세히 기록, 클린 코드 + OOP, 한글 주석

## In Progress

- VSCode Extension 본격 개발 미시작 (구조 설계 단계)

## Next Steps

- `src/` 디렉토리 구조 설계 및 스캐폴딩
- VSCode Extension 개발 환경 확인 (package.json, tsconfig.json 등)
- UI 레이어 → Service 레이어 → 파일 레이어 순으로 구현 시작
- `/enhance-claude-md` 실행하여 CLAUDE.md 나머지 항목 자동 보완 검토

## Known Issues

- `src/` 디렉토리 스캐폴딩 미완료 — `src/extension.ts` 하나만 존재, `src/ui/`, `src/service/`, `src/persistence/` 미생성

## Completed

- 2026-04-07: `/enhance-claude-md` 실행 — Tech Stack(버전 상세), Team Conventions(ESLint 규칙/빌드/테스트), Key Rules(VSCode Extension 필수 규칙) 항목 보완
- 2026-04-07: CLAUDE.md Architecture 섹션 보강 — 레이어 다이어그램, 데이터 흐름(Init 액션), 구현 vs 계획 상태 표, 주요 파일 표, VSCode 브릿지 포인트 추가
- 2026-04-07: `.claude/commands/enhance_claude_md.md` 보강 — Architecture 분석 sub-steps(a~g) 및 출력 형식(레이어 다이어그램+데이터흐름+Key Files+Planned vs Actual) 명세 추가
- 2026-04-08: `develop_references/features.json` 생성 — CLAUDE.md 기반 29개 기능 항목 추출 (F-001~F-029, functional/infrastructure 카테고리)
