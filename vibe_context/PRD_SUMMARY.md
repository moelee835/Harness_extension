# Agent Harness Framework — PRD 요약 및 개발자 결정 사항

문서 버전: 0.1.0 | 작성일: 2026-03-23

---

## 1. 프로젝트 한 줄 정의

> **Vibe Coding 전체 생애주기(PRD 작성 → Task 추출 → 실행 계획 → Ralph Loop 실행)를 VSCode Extension 하나로 완결하는 Agent Harness Framework**

---

## 2. 핵심 개념 요약

### 2.1 두 가지 이론적 기반

| 개념 | 역할 | 본 프로젝트 적용 |
|------|------|-----------------|
| **Effective harnesses for long-running agents** (Anthropic) | Initializer Agent + Coding Agent 2단계 구조. 초기 환경(init.sh, feature_list.json, claude-progress.txt)을 구성하고, 이후 Coding Agent가 기능을 하나씩 점진적으로 구현·테스트·커밋 | Configure 버튼 → `project_prompt.md`(Initializer 프롬프트) + `run_project.sh` 자동 생성 |
| **Ralph Loop** (Geoffrey Huntley) | `while :; do cat PROMPT.md \| claude ; done` 무한 루프. 상태는 파일/git에 저장. 컨텍스트가 오염되면 새 컨텍스트로 교체. guardrails.md로 교훈 승계 | Loop 구간 지정 → `run_loop.sh` + `loop_prompt.md` 자동 생성. 토큰 기반 컨텍스트 교체 로직 포함 |

### 2.2 사용자 워크플로

```
[1] New Project 생성
        ↓
[2] PRD 편집 (폼 기반 UI)
    - 요구사항 ID 자동 부여
    - git remote URL 설정 (선택)
        ↓
[3] Save PRD → vibe_context/PRD.md 생성
        ↓
[4] Extract Tasks (LLM 호출, 스트리밍)
    → Tasks 편집 (순서 변경, 내용 수정)
    → [선택] Enhance Tasks (LLM 재호출)
        ↓
[5] Plan to Run (LLM 호출)
    → 계층형 Plan 편집
    → Group for Ralph Loop (구간 선택 + 종료 조건 입력 必)
        ↓
[6] Configure (LLM 호출)
    → 산출물 일괄 생성:
      project_prompt.md / run_project.sh
      loop_prompt.md / run_loop.sh
      feature_list.json / .gitignore
        ↓
[7] Run → VSCode 터미널에서 run_project.sh 실행
    → Initializer Agent: init.sh, claude-progress.txt, feature_list.json 구성
    → Ralph Loop 시작: Coding Agent가 feature_list.json 기반 반복 구현
```

---

## 3. 기능 범위 요약

### MVP 포함

| 번호 | 기능 | 우선순위 |
|------|------|---------|
| US-001 | 새 프로젝트 생성 | Must |
| US-002 | 프로젝트 로드 | Must |
| US-004/005 | PRD 폼 기반 편집 (항목 추가/제거, ID 자동 부여) | Must |
| US-006 | PRD 저장 (.md) | Must |
| US-007 | PRD 불러오기 | Should |
| US-008 | Task 추출 (LLM, 스트리밍) | Must |
| US-009 | Tasks 편집 (순서 변경, 삭제) | Must |
| US-011 | 계층형 Plan 생성·편집 | Must |
| US-012 | Ralph Loop 구간 지정 + 종료 조건 | Must |
| US-013 | Configure — 모든 산출물 일괄 생성 | Must |
| US-014 | Run — 터미널 실행 | Must |
| US-015 | LLM 설정 (.env 기반) | Must |

### MVP 제외 (향후 검토)

- US-003: 프로젝트 삭제 (Should)
- US-010: Tasks 강화 (Could)
- Graph 기반 워크플로 UI (n8n/Dify 스타일)
- 클라우드 동기화, VS Code Marketplace 게시

---

## 4. 자동 생성 산출물 목록

Configure 버튼 클릭 시 workspace에 생성되는 파일:

```
{workspace}/
├── vibe_context/
│   ├── PRD.md                  # 완성된 요구사항 문서
│   ├── Tasks.md                # 정렬된 Task 목록
│   ├── ExecutionPlan.md        # 계층형 실행 계획
│   ├── project_prompt.md       # Initializer Agent 프롬프트
│   └── loop_prompt.md          # Coding Agent (Ralph Loop) 프롬프트
├── feature_list.json           # 기능 목록 (passes: false 초기값)
├── run_project.sh              # Initializer Agent 실행 스크립트
├── run_loop.sh                 # Ralph Loop 실행 스크립트
├── .env                        # LLM API 설정 (템플릿)
└── .gitignore                  # .env, .ralph/ 자동 포함
```

---

## 5. 기술 스택 (확정 방향)

| 영역 | 기술 |
|------|------|
| Extension Host | TypeScript, Node.js 18+, VS Code Extension API |
| Webview UI | React + @vscode/webview-ui-toolkit |
| LLM SDK | @anthropic-ai/sdk (기본), openai (선택) |
| 파일 I/O | vscode.workspace.fs API |
| 터미널 실행 | vscode.window.createTerminal |

---

## 6. 개발자 결정이 필요한 사항

아래 항목들은 현재 Open Issue로 분류되어 있으며 **개발 착수 전 반드시 결정이 필요**합니다.

---

### [결정-1] Graph 기반 워크플로 UI 포함 여부 ⚠️ 중요

**배경:** PRD 1.3 범위에 "n8n/Dify 스타일의 Graph UI"가 언급되어 있으나, 구현 난이도가 매우 높음.

**선택지:**
- A) **MVP에서 제외** — 계층형 리스트 UI로 구현, Graph UI는 v2에서 검토 ← 현재 방향
- B) **MVP에 포함** — React Flow 등 라이브러리 활용, 개발 기간 대폭 증가 예상

**결정 필요 이유:** UI 아키텍처의 핵심이므로 초기 설계에 영향. Plan 편집 UI 구조가 달라짐.

**권장:** A안. Graph UI는 MVP에서 제외하고 계층형 트리 UI로 시작. 요구사항 충족에 지장 없음.

**결정 기한:** 2026-04-01

---

### [결정-2] 지원 LLM Provider 범위

**배경:** 사용자가 다양한 LLM을 사용 중. Anthropic만 지원하면 사내 온프레미스 환경에서 사용 불가할 수 있음.

**선택지:**
- A) **Anthropic 단독** — 구현 단순, Anthropic SDK만 사용
- B) **Anthropic + OpenAI** — LLM_PROVIDER 환경변수로 전환 ← 현재 방향
- C) **OpenAI-compatible 인터페이스** — LLM_BASE_URL 커스텀으로 Ollama, Azure OpenAI 등 포함

**결정 필요 이유:** LLM Service Layer 추상화 수준 결정. 나중에 변경하면 리팩토링 비용 큼.

**권장:** B안 + LLM_BASE_URL 선택 옵션으로 C안 효과까지 포함. 구현 복잡도 최소.

**결정 기한:** 2026-04-01

---

### [결정-3] Windows에서의 쉘 스크립트 실행 방식 ⚠️ 중요

**배경:** 주 사용자 환경이 Windows 사내 PC. `run_project.sh`, `run_loop.sh`는 bash 기반이므로 Git Bash 또는 WSL 필요.

**선택지:**
- A) **Git Bash 필수 안내** — 사용자가 Git for Windows 설치해야 함
- B) **WSL 자동 감지** — WSL 존재 시 우선 사용, 없으면 Git Bash 안내
- C) **PowerShell 대안 스크립트 제공** — `run_project.ps1`, `run_loop.ps1` 추가 생성

**결정 필요 이유:** Configure 단계에서 어떤 파일을 생성할지 결정됨. C안은 스크립트 유지보수 2배.

**권장:** A+B안 병행. Git Bash는 개발자 환경에서 일반적. PowerShell 스크립트는 v2 검토.

**결정 기한:** 2026-04-15

---

### [결정-4] 프로젝트 메타데이터 저장 위치

**배경:** Extension이 관리하는 프로젝트 목록, 설정 등의 메타데이터를 어디에 저장할 것인가.

**선택지:**
- A) **Extension Global Storage** (`context.globalStorageUri`) — 모든 워크스페이스에서 접근 가능
- B) **Workspace Storage** (`.vscode/agent-harness.json`) — 프로젝트별 분리, git에 포함 가능
- C) **혼합** — 프로젝트 목록은 Global, 프로젝트 내용은 Workspace ← 현재 방향

**결정 필요 이유:** Extension 아키텍처 설계의 기반. 나중 변경 시 마이그레이션 필요.

**권장:** C안. 프로젝트 목록·LLM 설정은 Global Storage, PRD/Tasks/Plan 내용은 workspace `vibe_context/`에 파일로 저장.

**결정 기한:** 2026-04-01

---

### [결정-5] feature_list.json 자동 생성 상세도

**배경:** Anthropic 가이드에 따르면 feature_list.json에 각 기능의 검증 steps(네비게이션 단계 등)를 포함해야 효과적. LLM이 이를 자동 생성하는 상세도 수준 결정 필요.

**선택지:**
- A) **간단 버전** — `{ "description": "...", "passes": false }` 만 생성
- B) **상세 버전** — `description` + `steps` (구체적 검증 단계) + `category` 포함 ← 권장
- C) **사용자 선택** — UI에서 상세도 레벨 선택 옵션 제공

**결정 필요 이유:** Initializer Agent 프롬프트 설계와 feature_list.json 스키마 결정.

**권장:** B안. 가이드라인 예시와 동일한 상세 버전으로 에이전트 성능 극대화.

**결정 기한:** 2026-04-15

---

### [결정-6] Ralph Loop 종료 조건 실행 방식

**배경:** 사용자가 입력한 종료 조건(예: "feature_list.json의 모든 항목이 passes: true")을 run_loop.sh에서 어떻게 평가할 것인가.

**선택지:**
- A) **프롬프트에만 포함** — loop_prompt.md에 종료 조건을 명시하고 에이전트가 자체 판단
- B) **스크립트 조건 검사** — run_loop.sh에 bash 조건문으로 feature_list.json 파싱
- C) **혼합** — 에이전트가 종료 신호 파일(`.ralph/DONE`)을 생성하면 스크립트가 감지하여 루프 종료

**결정 필요 이유:** run_loop.sh 구현 방식이 크게 달라짐.

**권장:** C안. 에이전트가 종료 조건 충족 시 `.ralph/DONE` 파일을 작성하고, 스크립트가 이를 감지하여 루프 종료. 단순하면서 신뢰성 높음.

**결정 기한:** 2026-04-15

---

## 7. 주요 리스크 요약

| 리스크 | 영향도 | 대응 |
|--------|--------|------|
| 생성된 project_prompt.md 품질 불확실 | 높음 | 사용자 검토·편집 단계 필수화. 검증된 템플릿 제공 |
| Ralph Loop 무한 실행 비용 폭주 | 높음 | Max iterations 옵션 + Gutter 감지 자동 중단 |
| Windows bash 스크립트 실행 문제 | 높음 | Git Bash 안내, WSL 자동 감지 |
| LLM API 비용 증가 | 중간 | 사용자 자체 키 사용, 토큰 사용량 로컬 추적 |

---

## 8. 다음 단계

1. **[결정-1] ~ [결정-6]** 중 2026-04-01 기한 항목 우선 결정
2. Extension 프로젝트 초기 구조 생성 (TypeScript boilerplate)
3. LLM Service Layer 추상화 구현 (Anthropic SDK 기본)
4. PRD 편집 Webview UI MVP 구현
5. Configure 파일 생성 로직 구현 및 project_prompt.md 템플릿 검증
