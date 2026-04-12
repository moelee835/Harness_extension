# Ralph Loop 기반 장기 실행 에이전트 하네스 설계

> **출처 결합**: Anthropic "Effective harnesses for long-running agents" (2025.11.26) × Ralph Loop 방법론 (Geoffrey Huntley / Clayton Farr)

---

## 개요

`claude_code_longterm.md`는 **무엇이 문제인지**와 **어떤 구조적 아티팩트가 필요한지**를 설명합니다.  
`Ralph_loop.md`는 **어떻게 그 구조를 운영하는지**를 설명합니다.

이 문서는 두 접근법을 통합하여, Ralph Loop의 운영 철학 위에서 Anthropic의 장기 에이전트 패턴을 구현하는 설계 보고서입니다.

---

## 1. 실패 모드 매핑

두 문서가 공통으로 지적하는 실패 원인은 동일합니다.

| 실패 패턴 | Anthropic 진단 | Ralph Loop 진단 |
|-----------|---------------|-----------------|
| 한 번에 너무 많이 하려 함 | 컨텍스트 소진 후 절반만 구현된 상태 방치 | 긴 대화 맥락 누적으로 품질 저하 |
| 조기 완료 선언 | 진행 상태를 잘못 판단하고 "완료"라 선언 | "대충 끝났다"고 종료하는 성급한 수렴 |
| 검증 없는 완료 처리 | 단위 테스트만 통과시키고 E2E 검증 생략 | 테스트·린트·빌드 없이 작업 종료 |
| 이전 세션 상태 파악 실패 | 새 컨텍스트에서 이전 작업 추측에 시간 낭비 | 대화창이 아닌 파일에 상태를 두지 않음 |

**핵심 통찰**: Anthropic이 제시한 아티팩트(progress file, feature list, git commit)는 Ralph Loop의 "파일 기반 상태 관리" 원칙과 완벽하게 대응됩니다.

---

## 2. 개념 대응표

두 방법론의 구성요소를 1:1로 매핑합니다.

| Ralph Loop 구성요소 | Anthropic 대응 구성요소 | 통합 역할 |
|--------------------|------------------------|----------|
| `specs/` | `feature_list.json` | 요구사항의 진실 원천(Source of Truth). 무엇을 만들어야 하는지 기록. |
| `IMPLEMENTATION_PLAN.md` | `claude-progress.txt` | 현재까지의 진행 상황과 다음 우선순위 기록. |
| `AGENTS.md` | `init.sh` | 빌드·실행·검증 방법과 운영 규칙 정리. |
| `PROMPT_plan.md` | Initializer Agent 프롬프트 | 초기 환경 설정 및 계획 수립 지시. |
| `PROMPT_build.md` | Coding Agent 프롬프트 | 단일 기능 구현 및 검증 지시. |
| `loop.sh` | 외부 하네스 루프 | 에이전트를 반복 실행시키는 셸 스크립트. |

---

## 3. 통합 아키텍처

### 3.1 파일 구조

```
project-root/
├── specs/                        # (Ralph: specs/) 기능 요구사항 진실 원천
│   └── features.json             # (Anthropic: feature_list.json) passes 필드로 상태 추적
├── AGENTS.md                     # (Ralph: AGENTS.md) + (Anthropic: init.sh) 통합
├── IMPLEMENTATION_PLAN.md        # (Ralph: IMPLEMENTATION_PLAN.md) + (Anthropic: claude-progress.txt) 통합
├── PROMPT_plan.md                # Initializer Agent 전용 프롬프트
├── PROMPT_build.md               # Coding Agent 전용 프롬프트
├── loop.sh                       # 외부 반복 실행 루프
└── .git/                         # 커밋 기반 상태 복원 기반
```

### 3.2 두 단계 에이전트 분리 (Anthropic 핵심 패턴)

Ralph Loop는 루프 구조를 제공하지만, **초기화 단계와 구현 단계를 구분하지 않습니다.**  
Anthropic의 핵심 인사이트는 **첫 번째 컨텍스트 윈도우를 특별 취급**해야 한다는 것입니다.

```
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
```

---

## 4. 통합 운영 흐름

### 4.1 Initializer Agent (PROMPT_plan.md)

```markdown
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
```

### 4.2 Coding Agent (PROMPT_build.md) — Ralph Loop 구조 적용

Ralph Loop의 6단계 사이클이 그대로 적용됩니다.

```
① 스펙 확인      → specs/features.json 읽기 (passes: false인 최우선 기능 선택)
② 계획 갱신      → IMPLEMENTATION_PLAN.md 읽고 현재 목표 확인/갱신
③ 단일 구현      → 선택한 기능 하나만 구현 (Ralph: "가장 중요한 작업 하나만")
④ 검증 (압력)    → AGENTS.md의 검증 명령 실행: 테스트 + 타입체크 + 린트 + 빌드 + E2E
⑤ 실패 시 수정   → 에러를 읽고 수정 후 ④로 복귀 (Ralph: backpressure)
⑥ 성공 시 커밋   → features.json의 passes를 true로, git commit, IMPLEMENTATION_PLAN.md 갱신
```

### 4.3 세션 시작 루틴 (Anthropic 패턴)

```markdown
## Coding Agent 세션 시작 시 필수 순서

1. `pwd` 실행 — 작업 디렉토리 확인
2. `AGENTS.md` 읽기 — 빌드·테스트 명령 파악
3. `IMPLEMENTATION_PLAN.md` 읽기 — 이전 세션에서 무엇을 했는지 파악
4. `git log --oneline -20` — 최근 커밋 히스토리 확인
5. AGENTS.md의 개발 서버 시작 명령 실행
6. **기본 E2E 테스트 실행** — 이전 세션이 앱을 깨진 상태로 두지 않았는지 확인
7. specs/features.json에서 passes: false인 최우선 기능 선택
8. 구현 시작
```

> **왜 6번(E2E 테스트 먼저)이 중요한가**: 깨진 상태에서 새 기능을 구현하면 문제가 누적됩니다.  
> Anthropic의 실험에서 이 단계가 "세션 낭비"를 가장 효과적으로 줄였습니다.

---

## 5. 핵심 파일 설계

### 5.1 specs/features.json

Ralph Loop의 `specs/`와 Anthropic의 `feature_list.json`을 결합한 형태입니다.

```json
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
```

> **중요**: `passes` 필드만 수정 가능. description, steps 절대 삭제/수정 금지.  
> (Anthropic: "It is unacceptable to remove or edit tests")

### 5.2 AGENTS.md

Ralph Loop의 `AGENTS.md`와 Anthropic의 `init.sh`를 통합한 문서입니다.

```markdown
# AGENTS.md

## 개발 서버 실행
npm run dev

## 검증 명령 (반드시 이 순서로 실행)
1. npm run type-check   # TypeScript 타입 검사
2. npm run lint         # ESLint
3. npm run test         # 단위 테스트
4. npm run build        # 빌드
5. npm run test:e2e     # E2E 테스트 (Puppeteer 등)

## 기본 E2E 스모크 테스트
세션 시작 시 반드시 실행:
- 개발 서버 시작
- 메인 페이지 접근 확인
- 핵심 기능 1개 동작 확인

## 운영 규칙
- 한 번에 하나의 기능만 구현할 것
- 모든 검증을 통과한 후에만 커밋할 것
- specs/features.json의 passes 필드 외 내용은 수정하지 말 것
```

### 5.3 IMPLEMENTATION_PLAN.md

Ralph Loop의 `IMPLEMENTATION_PLAN.md`와 Anthropic의 `claude-progress.txt`를 통합합니다.

```markdown
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
```

---

## 6. loop.sh 설계

Ralph Loop의 외부 루프를 Anthropic의 두 단계 에이전트 구조에 맞게 확장합니다.

```bash
#!/bin/bash
# loop.sh — Ralph Loop 기반 장기 실행 에이전트 하네스

MAX_ITERATIONS=${1:-999}
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
```

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

`claude_code_longterm.md`의 미래 연구 방향(단일 에이전트 vs. 다중 에이전트)을 Ralph Loop 구조로 확장하면:

| 에이전트 역할 | 전용 PROMPT 파일 | 담당 검증 |
|--------------|-----------------|----------|
| Coding Agent | `PROMPT_build.md` | 기능 구현 + 단위 테스트 |
| Testing Agent | `PROMPT_test.md` | E2E 검증 + 버그 보고 |
| QA Agent | `PROMPT_qa.md` | 코드 품질 + 리팩토링 |
| Cleanup Agent | `PROMPT_cleanup.md` | 기술 부채 정리 + 문서화 |

각 에이전트는 동일한 loop.sh 구조 위에서 역할에 맞는 PROMPT 파일만 교체하여 운영합니다.

---

## 9. 한계 및 주의사항

두 방법론이 공통으로 인정하는 한계:

1. **나쁜 스펙 → 나쁜 결과**: specs/features.json의 품질이 전체 결과를 결정합니다. 아키텍처 설계는 여전히 인간의 판단이 필요합니다.
2. **토큰 비용**: 반복이 많아질수록 비용이 증가합니다. `MAX_ITERATIONS` 제한과 기능 범위 관리가 필수입니다.
3. **비전 한계**: Puppeteer 등 브라우저 자동화 도구를 사용하더라도 브라우저 네이티브 모달 등 일부 UI는 검증하기 어렵습니다.
4. **고차원 설계**: Ralph Loop는 "작은 단위 구현자"로 AI를 운영할 때 효과적이며, 전체 아키텍처 결정에는 적합하지 않습니다.

---

## 10. 한 줄 정리

> **Ralph Loop 기반 장기 에이전트 하네스**는 "Initializer가 파일 기반 환경을 설정하고, Coding Agent가 specs/features.json을 기준으로 한 번에 하나의 기능을 구현–검증–커밋하는 사이클을 loop.sh가 반복 구동하는 자율 개발 운영 방식"입니다.
