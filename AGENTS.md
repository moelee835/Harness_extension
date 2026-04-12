# AGENTS.md

이 파일은 Ralph Loop 기반 Coding Agent가 매 세션 시작 시 반드시 읽어야 합니다.
빌드·검증 명령과 운영 규칙을 기술합니다.

## 프로젝트 개요

Claude Code 하네스 엔지니어링을 쉽게 하기 위한 VSCode Extension.
`.vsix` 파일 배포 방식으로 Claude Code CLI 에이전트를 VSCode에서 편리하게 호출·관리한다.

언어: TypeScript 5.9.3  |  런타임: Node.js 22.x  |  프레임워크: VSCode Extension ^1.110.0
빌드 도구: esbuild 0.27.3  |  번들 출력: `dist/extension.js` (CJS 포맷)

## 검증 명령 (반드시 이 순서로 실행)

1. `npm run check-types`  — TypeScript 타입 검사 (tsc --noEmit, strict: true)
2. `npm run lint`          — ESLint 9 + typescript-eslint (src/ 디렉토리 대상)
3. `npm test`              — Mocha + @vscode/test-cli (VSCode Extension Host 환경)
4. `node esbuild.js`       — esbuild 번들링 → dist/extension.js 생성

> 모든 명령이 exit code 0으로 종료될 때만 커밋 허용.
> 단 하나라도 실패하면 에러를 읽고 수정 후 처음부터 재실행.

## 세션 시작 시 스모크 체크

매 세션 시작 시 반드시 실행:

```bash
npm run check-types && npm run lint && node esbuild.js
```

> 스모크 체크 실패 시 새 기능 구현 전에 반드시 수정 먼저.

## 운영 규칙

- 한 번에 하나의 기능만 구현할 것 (specs/features.json의 id 순서 또는 priority 순)
- 모든 검증을 통과한 후에만 `git commit` 할 것
- `specs/features.json`의 `passes` 필드 외 내용은 절대 수정하지 말 것
- `description`과 `steps`는 삭제·수정 금지 — 요구사항 진실 원천이므로
- 커밋 메시지 형식: `feat(F-XXX): 기능 설명\n\n- 변경: ...\n- 이유: ...\n- 검증: 검증 게이트 모두 통과`

## VSCode Extension 특수 규칙

- `dist/` 디렉토리는 esbuild가 자동 생성하므로 **절대 직접 편집 금지**
- `vscode` 모듈은 번들 외부(external)로 처리되므로 `import * as vscode from 'vscode'`만 사용 — 번들에 포함하지 말 것
- `activate(context)` 내에서 등록한 **모든 disposable은 반드시 `context.subscriptions.push(...)`** 해야 함 — 누락 시 메모리 누수
- `package.json#contributes.commands`에 선언된 명령 ID와 `vscode.commands.registerCommand(...)` 첫 번째 인자가 **반드시 일치**해야 함
- 새 명령 추가 시 `package.json#contributes.commands`와 `activate()` 양쪽 모두 수정
- TypeScript `strict: true` 필수 — 암묵적 any, null 미체크 금지
- `module: Node16` — ESM/CJS 혼용 시 `.js` 확장자를 import 경로에 명시
- 주석은 **한글**로 작성하고 가능한 세부적으로 달 것
- 코드는 클린 코드 원칙 + OOP 기반으로 작성
