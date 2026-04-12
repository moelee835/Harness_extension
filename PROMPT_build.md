# PROMPT_build.md — Coding Agent (Ralph Loop)

이 프롬프트는 `loop.sh`가 매 반복마다 Coding Agent에게 전달합니다.
반드시 아래 순서를 따르고, 단계를 건너뛰지 마십시오.

---

## 세션 시작 루틴 (매 반복 필수)

1. `pwd` — 작업 디렉토리가 프로젝트 루트인지 확인
2. `AGENTS.md` 읽기 — **검증 명령**과 **VSCode Extension 특수 규칙** 숙지
   (이 파일이 이 세션에서 실행할 모든 명령의 기준입니다)
3. `IMPLEMENTATION_PLAN.md` 읽기 — 이전 세션에서 무엇을 했는지, 다음 작업이 무엇인지 파악
4. `git log --oneline -10` — 최근 커밋 히스토리 확인
5. AGENTS.md에 명시된 **스모크 체크** 실행:
   ```bash
   npm run check-types && npm run lint && node esbuild.js
   ```
   - 실패 시: 새 기능 구현 전에 반드시 수정 먼저

---

## 구현 사이클 (6단계)

### ① 스펙 확인

`specs/features.json`을 읽어 `passes: false`인 항목 중
`IMPLEMENTATION_PLAN.md`의 "구현 순서 가이드"를 참고하여 최우선 기능 하나를 선택합니다.

선택 기준:
- 레이어 의존성: 하위 레이어(인프라)가 먼저
- 동일 레이어 내: `priority` 숫자가 낮을수록 먼저
- priority 필드가 없는 항목은 id 순서대로

### ② 계획 갱신

`IMPLEMENTATION_PLAN.md`의 "다음 우선 작업" 첫 번째 항목이 선택한 기능과 일치하는지 확인합니다.
불일치하면 파일을 업데이트합니다.

### ③ 단일 구현

선택한 기능 **하나만** 구현합니다. 범위를 벗어나지 마십시오.
`AGENTS.md`의 "VSCode Extension 특수 규칙"을 반드시 준수합니다.

VSCode Extension 핵심 규칙 요약:
- `activate()` 내 모든 disposable → `context.subscriptions.push(...)` 필수
- `package.json#contributes.commands` ID ↔ `registerCommand()` ID 반드시 일치
- `vscode` 모듈은 절대 번들에 포함하지 말 것
- 주석은 한글로, 클린 코드 + OOP 원칙 준수

### ④ 검증 (AGENTS.md의 검증 명령 순서대로)

```bash
npm run check-types   # ① TypeScript 타입 검사
npm run lint          # ② ESLint
npm test              # ③ Mocha + @vscode/test-cli
node esbuild.js       # ④ esbuild 번들링
```

모두 exit code 0이어야 합니다.

### ⑤ 실패 시 수정

에러 메시지를 읽고 정확한 원인을 파악합니다.
수정 후 ④로 복귀합니다.

**검증 우회 절대 금지**:
- `// @ts-ignore`, `// @ts-nocheck`
- `eslint-disable` 주석 (기존 파일에 이미 있는 경우 제외)
- 타입 단언(`as any`) 남용
- 테스트 assertion 수정

### ⑥ 성공 시 커밋

```bash
# 1. specs/features.json에서 구현된 기능의 passes를 true로 변경
#    implemented_in_commit 필드에는 커밋 후 해시를 기록 (아래 참고)

# 2. 스테이징 및 커밋
git add -A
git commit -m "feat(F-XXX): [기능 설명]

- 변경: [어떤 파일에 무엇을 추가/수정했는지]
- 이유: [왜 이 방식으로 구현했는지]
- 검증: npm run check-types && npm run lint && npm test && node esbuild.js 모두 통과"

# 3. 커밋 해시를 specs/features.json의 implemented_in_commit에 기록
HASH=$(git rev-parse HEAD)
# features.json의 해당 항목 implemented_in_commit 필드를 $HASH로 업데이트

# 4. IMPLEMENTATION_PLAN.md 갱신
#    - 완료된 기능 수 업데이트
#    - 해당 항목 체크박스를 [x]로 변경
#    - 세션 로그에 완료 내용 추가

# 5. 갱신된 파일 추가 커밋
git add specs/features.json IMPLEMENTATION_PLAN.md
git commit -m "chore(F-XXX): passes=true 및 진행 상황 갱신"
```

---

## 절대 금지 사항

- 여러 기능을 한 번에 구현하는 것
- 검증 없이 커밋하는 것
- `specs/features.json`의 `description`, `steps`, `id`, `category` 수정 또는 삭제
- `dist/` 디렉토리 직접 편집
- `vscode` 모듈을 번들에 포함시키는 것
- 세션 종료 전 `IMPLEMENTATION_PLAN.md` 미갱신
