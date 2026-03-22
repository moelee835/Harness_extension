# Agent Harness Framework - PRD

프로젝트/기능명: Agent Harness Framework

문서 버전: 0.1.0

작성일: 2026-03-20

작성자: 이원준

상태(Status): ✅ Draft / In Review / Approved

---

## 1. 개요

### 1.1 배경(Background)

Claude Code 등 AI 에이전트를 활용한 Vibe Coding이 보편화되면서, 개발자가 에이전트에게 작업을 지시하기 위한 PRD(Product Requirements Document), Task 목록, 실행 계획서 등의 문서를 직접 작성해야 하는 부담이 발생하고 있다. 이 문서들은 에이전트가 이해하기 쉬운 정형화된 형식을 따라야 하며, 그 구성 방식 자체가 에이전트 성능에 직접적인 영향을 미친다.

또한 장시간 자율 개발을 위한 **Effective harnesses for long-running agents** 패턴(Initializer agent + Coding agent 구조)과 **Ralph Loop** 기법(컨텍스트 순환 반복 루프)을 적용하려면, 쉘 스크립트 작성, 에이전트 프롬프트 설계, 테스트 스위트 구성 등에 대한 전문 지식이 필요하여 진입 장벽이 높다.

### 1.2 목적(Goal)

Vibe Coding 전체 생애주기(PRD 작성 → Task 추출 → 실행 계획 수립 → 에이전트 실행 → 반복 루프)를 VSCode Extension 하나로 완결되게 지원하는 **Agent Harness Framework**를 개발한다.

구체적으로는 다음을 자동화한다:
- 정형화된 PRD 문서 작성 (폼 기반 UI)
- LLM을 활용한 Task 추출 및 실행 계획 생성
- Ralph Loop 기반의 반복 실행 구간 및 종료 조건 설정
- Initializer agent 프롬프트(`project_prompt.md`), 루프 실행 스크립트(`run_project.sh`), 기능 추적 파일(`feature_list.json`) 자동 생성

### 1.3 범위(Scope)

**이번 릴리즈에 포함되는 것:**
- PRD 작성을 위한 VSCode Extension Webview UI (폼 기반, 부록 §3의 PRD 구성요소 템플릿 기반)
- LLM API 연동을 통한 Task 추출, Task 강화, Execution Plan 생성, project_prompt.md 생성
- 계층형 Execution Plan 편집 UI
- Ralph Loop 구간 지정 및 종료 조건 설정 기능
- 다음 산출물 자동 생성: `PRD.md`, `Tasks.md`, `ExecutionPlan.md`, `project_prompt.md`, `run_project.sh`, `feature_list.json`
- LLM provider 설정 (`.env` 파일 기반)

**이번 릴리즈에서 제외되는 것:**
- Graph 기반 시각적 워크플로 편집 UI (n8n/Dify 스타일) — 향후 릴리즈 검토
- 클라우드 동기화 / 팀 공유 기능
- VS Code Marketplace 게시 (초기 배포는 .vsix 로컬 설치)
- 에이전트 실행 결과 실시간 모니터링 대시보드

---

## 2. 대상 사용자 및 시나리오

### 2.1 대상 사용자(Persona)

```
[Persona-1] 사내 SW 개발자 (비-AI 전문가)

- 역할/직무: 사내 서비스 개발 담당 소프트웨어 엔지니어
- 사용 환경: 사내 폐쇄망 또는 사외 개인 PC, VSCode 사용
- 주요 목표: AI 에이전트를 이용해 반복적인 개발 작업을 자동화하고 싶음
- 주요 Pain Point:
  - 잦은 야근으로 AI 최신 기술을 습득할 시간이 없음
  - PRD 등 기획 문서 작성이 번거롭고 형식을 잘 모름
  - 쉘 스크립트 작성 및 에이전트 프롬프트 설계 경험이 부족함
  - 에이전트가 무슨 계획으로 개발을 진행하는지 직관적으로 파악하기 어려움
  - Ralph Loop 같은 Vibe Coding 기법을 적용하고 싶지만 구축이 어려움
```

### 2.2 주요 사용 시나리오(User Scenarios)

**시나리오 1: AI 뉴스 리포트 자동 발송 서비스 개발**

- **상황**: 사내에서 AI 관련 뉴스를 일정 시간마다 자동으로 수집·요약하여 메일로 발송하는 서비스를 Vibe Coding으로 빠르게 개발하고 싶다. FE/BE 애플리케이션을 개발하고 Docker 이미지로 패키징하여 사내 공용서버에 배포하는 것이 목표다.

- **기대 행동 흐름:**
  1. 사용자가 Agent Harness Framework Extension을 VSCode에 설치하고 실행한다.
  2. Extension 화면에서 **New Project**를 생성한다. (프로젝트명: "AI News Reporter")
  3. PRD 편집 화면이 열리고, 사용자는 서비스 목적·페르소나·기능 요구사항·API 명세 등을 폼에 입력한다. 요구사항에는 자동으로 ID(USC-0001 등)가 부여된다.
  4. PRD 작성 완료 후 **저장**한다. `vibe_context/PRD.md` 파일이 생성된다.
  5. **Extract Tasks** 버튼을 눌러 LLM이 PRD로부터 개발 Task를 추출한다. 추출된 Task 목록이 별도 화면에 표시된다.
  6. 사용자는 Task 순서를 조정하거나 세부 사항을 편집한다.
  7. **Plan to Run** 버튼을 눌러 계층형 Execution Plan을 생성한다. (예: "API 구현" 하위에 "뉴스 수집 API", "요약 API" 등이 나열됨)
  8. 특정 Task 구간(예: "기능 구현 ~ 테스트")을 선택하고 **Group for Ralph Loop** 버튼을 눌러 반복 루프 구간으로 지정한다. 종료 조건을 반드시 입력한다. (예: "feature_list.json의 모든 기능이 passes: true 상태일 때")
  9. **Configure** 버튼을 눌러 `project_prompt.md`, `run_project.sh`, `feature_list.json` 등 에이전트 실행에 필요한 모든 파일을 생성한다.
  10. VSCode 통합 터미널에서 `bash run_project.sh`를 실행하여 Initializer Agent가 프로젝트 초기 환경을 구성한다. (`init.sh`, `claude-progress.txt`, 초기 git commit 생성)
  11. Ralph Loop가 시작되어 Coding Agent가 `feature_list.json`을 참조하며 기능을 하나씩 구현·테스트·커밋한다.

---

## 3. 기능 요구사항(Functional Requirements)

### 3.1 사용자 스토리(User Stories)

```
[US-001] 새 프로젝트 생성하기
- As: SW 개발자
- I want: Extension에서 새 프로젝트를 생성하고 이름을 지정하고 싶다
- So that: 작업할 프로젝트를 구분하여 관리할 수 있다
- Priority: Must
- Status: Planned

[US-002] 프로젝트 로드하기
- As: SW 개발자
- I want: 이전에 만든 프로젝트를 목록에서 선택하여 PRD/Plan/Tasks를 불러오고 싶다
- So that: 이전 작업을 이어서 진행할 수 있다
- Priority: Must
- Status: Planned

[US-003] 프로젝트 삭제하기
- As: SW 개발자
- I want: 더 이상 필요 없는 프로젝트를 목록에서 제거하고 싶다
- So that: 프로젝트 목록을 깔끔하게 관리할 수 있다
- Priority: Should
- Status: Planned

[US-004] PRD 작성하기
- As: SW 개발자
- I want: 폼 기반 UI를 통해 PRD 구성 요소를 항목별로 입력하고 싶다
- So that: PRD 형식을 몰라도 빠짐없이 문서를 작성할 수 있다
- Description: 부록 §3의 PRD 구성요소 템플릿을 기반으로 한 입력 폼을 제공한다.
             각 요구사항 항목에는 자동으로 고유 ID(예: US-001, USC-001)가 부여된다.
- Priority: Must
- Status: Planned

[US-005] PRD 항목 추가/제거하기
- As: SW 개발자
- I want: 기능 요구사항 등 복수 항목을 + 버튼으로 추가하고 × 버튼으로 제거하고 싶다
- So that: 가변적인 수의 요구사항을 유연하게 관리할 수 있다
- Description: 우선순위는 Must / Should / Could / Won't 중 선택한다.
- Priority: Must
- Status: Planned

[US-006] PRD 저장하기
- As: SW 개발자
- I want: 작성한 PRD를 현재 워크스페이스에 .md 파일로 저장하고 싶다
- So that: 파일을 직접 열어 내용을 확인·공유할 수 있다
- Description: 저장 경로는 `{workspace}/vibe_context/PRD.md`를 기본으로 한다.
- Priority: Must
- Status: Planned

[US-007] PRD 불러오기
- As: SW 개발자
- I want: 기존 .md 형식의 PRD 파일을 Extension에 불러와 편집하고 싶다
- So that: 이미 작성된 PRD를 재활용하거나 수정할 수 있다
- Description: 지정된 형식과 다를 경우 경고 메시지를 출력하고 편집 가능한 상태로 로드한다.
- Priority: Should
- Status: Planned

[US-008] Task 추출하기
- As: SW 개발자
- I want: 완성된 PRD를 LLM에 전달하여 개발 Task 목록을 자동으로 추출하고 싶다
- So that: PRD에서 직접 실행 가능한 개발 단위 작업을 빠르게 도출할 수 있다
- Description: Task는 명확한 순서를 가지며, 추출 결과는 PRD 화면과 분리된 별도 화면에
             리스트 형식으로 출력된다. LLM 응답은 스트리밍으로 실시간 표시한다.
- Priority: Must
- Status: Planned

[US-009] Tasks 편집하기
- As: SW 개발자
- I want: 추출된 Task의 내용·순서·세부 설명을 편집하거나 특정 Task를 삭제하고 싶다
- So that: LLM이 추출한 결과를 내 의도에 맞게 보정할 수 있다
- Priority: Must
- Status: Planned

[US-010] Tasks 강화 기능
- As: SW 개발자
- I want: 편집된 Task 목록을 LLM에 다시 전달하여 보완을 요청하고 싶다
- So that: 사용자가 수정한 순서와 내용이 반영된 더 완성도 높은 Task 목록을 얻을 수 있다
- Priority: Could
- Status: Planned

[US-011] Plan 기능
- As: SW 개발자
- I want: Tasks 화면에서 "Plan to Run" 버튼을 눌러 계층형 실행 계획을 생성하고 싶다
- So that: 에이전트가 단계적으로 작업을 수행할 수 있는 구체적인 계획을 확인·편집할 수 있다
- Description: 큰 단위 Task를 클릭하면 하위 Task를 접거나 펼칠 수 있다.
             세부 항목 편집도 인라인으로 가능하다.
- Priority: Must
- Status: Planned

[US-012] Ralph Loop 구간 설정 기능
- As: SW 개발자
- I want: Plan Task들 중 일부 구간을 선택하여 Ralph Loop 반복 실행 구간으로 지정하고 싶다
- So that: 에이전트가 해당 구간을 자율적으로 반복 실행하며 점진적으로 기능을 완성하게 할 수 있다
- Description: "Group for Ralph Loop" 버튼으로 선택 구간을 루프화한다.
             루프 종료 조건을 반드시 입력해야 한다 (예: "feature_list.json의 모든 항목이 passes: true일 때").
             종료 조건을 입력하지 않으면 다음 단계로 진행이 불가하다.
             Ralph Loop는 `while :; do cat project_prompt.md | claude ; done` 패턴을 기반으로
             하며, 컨텍스트 순환 시 .ralph/guardrails.md를 통해 이전 세션의 교훈이 승계된다.
- Priority: Must
- Status: Planned

[US-013] 프로젝트 파일 생성(Configure) 기능
- As: SW 개발자
- I want: "Configure" 버튼 하나로 에이전트 실행에 필요한 모든 파일을 자동 생성하고 싶다
- So that: 쉘 스크립트나 프롬프트 작성 없이 즉시 에이전트 실행 준비를 마칠 수 있다
- Description:
  생성 파일 목록:
  1. `vibe_context/PRD.md` — 완성된 요구사항 문서
  2. `vibe_context/Tasks.md` — 정렬된 Task 목록
  3. `vibe_context/ExecutionPlan.md` — 계층형 실행 계획
  4. `vibe_context/project_prompt.md` — Initializer Agent 프롬프트
     (부록 §1 가이드라인 기반: init.sh 생성, claude-progress.txt, feature_list.json 작성 지시 포함)
  5. `feature_list.json` — 전체 기능 목록 (passes: false 초기값)
  6. `run_project.sh` — Initializer Agent 실행 스크립트
  7. `run_loop.sh` — Ralph Loop 실행 스크립트 (loop_prompt.md 포함)
  ** 모든 프로젝트는 반드시 엄격한 Test suite를 갖추도록 하는 것을 필수사항으로 규정한다.
  git 연동(remote repository URL)은 선택적으로 설정 가능하며, PRD 작성 단계에서 입력한다.
- Priority: Must
- Status: Planned

[US-014] run_project 실행 기능
- As: SW 개발자
- I want: Extension에서 "Run" 버튼을 눌러 run_project.sh를 VSCode 통합 터미널에서 실행하고 싶다
- So that: 별도의 터미널 조작 없이 에이전트를 즉시 구동할 수 있다
- Description:
  run_project.sh 내부 동작:
  1. `cat vibe_context/project_prompt.md | claude` 명령으로 Initializer Agent 실행
  2. Initializer Agent는 init.sh, claude-progress.txt, feature_list.json 및 초기 git commit 생성
  3. 이후 run_loop.sh가 Ralph Loop를 시작
  git commit 자동화 포함. remote repository 연결 설정이 있으면 push도 수행한다.
- Priority: Must
- Status: Planned

[US-015] LLM 설정 기능
- As: SW 개발자
- I want: Extension UI에서 LLM provider와 API 키를 설정하고 싶다
- So that: 내 환경에 맞는 LLM 서비스로 모든 AI 기능을 사용할 수 있다
- Description:
  설정은 workspace의 `.env` 파일에 저장된다. .env는 .gitignore에 자동 추가된다.
  지원 provider: Anthropic (기본), OpenAI (선택)
  설정 항목: LLM_PROVIDER, LLM_MODEL, LLM_API_KEY, LLM_BASE_URL(optional)
- Priority: Must
- Status: Planned
```

### 3.2 상세 기능 정의

#### 3.2.1 PRD 편집기 (Webview UI)

```
기능명: PRD 편집기

설명:
  부록 §3의 PRD 구성요소 템플릿을 기반으로 한 폼 기반 편집 UI.
  VSCode Webview Panel로 구현되며, 메인 편집 영역에 탭 방식으로 표시된다.
  각 섹션은 아코디언 방식으로 접고 펼칠 수 있다.
  요구사항 항목(User Story, Scenario, Business Rule 등)에는 자동으로 순번 ID가 부여된다.
  Usecase ID 참조는 드롭다운으로 선택 가능하다.

입력:
  - 사용자 폼 입력값 (프로젝트명, 목적, 페르소나, 기능 요구사항, API 명세 등)
  - git remote URL (선택)
  - 자동저장 간격 설정

출력/결과:
  - Extension 메모리 내 PRD 데이터 구조체 (JSON)
  - 저장 시: `{workspace}/vibe_context/PRD.md` (부록 §3 형식)

예외/에러 케이스:
  - 필수 항목(프로젝트명, 목적, 최소 1개 이상의 User Story) 미입력 시 저장 버튼 비활성화
  - vibe_context 디렉토리가 없으면 자동 생성
  - 저장 실패(권한 오류 등) 시 오류 다이얼로그 표시
```

#### 3.2.2 Task 추출 및 편집

```
기능명: Task 추출 및 편집

설명:
  완성된 PRD 데이터를 LLM에 전달하여 개발 Task 목록을 추출한다.
  추출된 Task는 별도 Webview 패널에 순서 있는 리스트로 표시된다.
  각 Task는 드래그 앤 드롭으로 순서 변경, 인라인 편집, 삭제가 가능하다.
  "Enhance Tasks" 버튼으로 편집된 Task 목록을 LLM에 재전달하여 보완할 수 있다.

입력:
  - 저장된 PRD 데이터 (전체 섹션)
  - 사용자 편집 지시사항 (Tasks 강화 요청 시)

출력/결과:
  - Task 목록 (화면 표시)
  - 저장 시: `{workspace}/vibe_context/Tasks.md`

예외/에러 케이스:
  - PRD가 저장되지 않은 상태에서 Extract Tasks 버튼 클릭 시 경고 출력
  - LLM API 타임아웃(60초) 시 재시도 옵션 제공 (최대 3회)
  - LLM이 Task를 0개 반환한 경우 "PRD 내용이 불충분합니다" 안내
```

#### 3.2.3 Plan 편집기 (계층형)

```
기능명: Plan 편집기

설명:
  Task 목록을 기반으로 LLM이 계층형 실행 계획을 생성한다.
  큰 단위 Task 아래에 세부 Sub-task가 나열된다.
  각 항목은 클릭으로 펼치기/접기, 인라인 편집 가능.
  "Group for Ralph Loop" 버튼으로 선택한 Task 구간을 루프화한다.

입력:
  - Tasks.md 데이터
  - 사용자 Plan 편집 내용

출력/결과:
  - 계층형 Plan 화면 표시
  - 저장 시: `{workspace}/vibe_context/ExecutionPlan.md`

예외/에러 케이스:
  - Tasks가 없는 상태에서 Plan 생성 시도 시 경고
  - LLM API 오류 시 오류 메시지 및 재시도 버튼
```

#### 3.2.4 Ralph Loop 구성

```
기능명: Ralph Loop 구성

설명:
  Plan에서 선택한 Task 구간을 Ralph Loop(`while :; do cat prompt | claude ; done`) 기반의
  반복 실행 구간으로 설정한다.
  토큰 사용량 기반 컨텍스트 순환: <60% 정상, 60-80% 경고, >80% 강제 교체.
  guardrails.md를 통해 세션 간 실패 교훈을 승계한다.
  종료 조건은 필수 입력이며, 추상적인 조건도 허용한다.

입력:
  - 선택된 Plan Task 구간
  - 루프 종료 조건 텍스트 (필수)
  - 토큰 임계값 설정 (선택, 기본값: warn=70%, rotate=80%)

출력/결과:
  - `run_loop.sh` — Ralph Loop 실행 스크립트
  - `vibe_context/loop_prompt.md` — Coding Agent용 반복 실행 프롬프트
    (현재 세션 시작 시 수행할 사항: pwd → claude-progress.txt 읽기 → feature_list.json 읽기
     → git log 확인 → init.sh 실행 → 기본 기능 검증 → 다음 미완성 기능 작업)

예외/에러 케이스:
  - 종료 조건 미입력 시 저장 불가, 경고 메시지 표시
  - Plan Task가 선택되지 않은 상태에서 루프화 시도 시 경고
```

#### 3.2.5 프로젝트 파일 생성 (Configure)

```
기능명: 프로젝트 파일 생성

설명:
  PRD, Tasks, Plan, Loop 설정을 종합하여 에이전트 실행에 필요한 모든 파일을 생성한다.
  LLM을 호출하여 project_prompt.md를 작성한다.
  project_prompt.md는 부록 §1 가이드라인에 따라 Initializer Agent가 수행할 사항을 포함:
    - init.sh 작성 (개발 서버 시작, 기본 E2E 테스트 실행)
    - claude-progress.txt 초기화
    - feature_list.json 작성 (passes: false로 초기화)
    - 초기 git commit 수행
  모든 프로젝트에 엄격한 Test suite 구성이 필수 사항으로 포함된다.

입력:
  - PRD.md, Tasks.md, ExecutionPlan.md 데이터
  - Loop 설정 (종료 조건, 토큰 임계값)
  - git remote URL (선택)

출력/결과:
  생성 파일 전체 목록:
  - `vibe_context/PRD.md`
  - `vibe_context/Tasks.md`
  - `vibe_context/ExecutionPlan.md`
  - `vibe_context/project_prompt.md`
  - `vibe_context/loop_prompt.md`
  - `feature_list.json`
  - `run_project.sh`
  - `run_loop.sh`
  - `.env` (미존재 시 템플릿 생성)
  - `.gitignore` (.env, .ralph/ 자동 추가)

예외/에러 케이스:
  - 필수 단계(PRD, Tasks, Plan, Loop 종료 조건) 미완료 시 Configure 버튼 비활성화
  - 파일 쓰기 실패 시 실패한 파일 목록과 함께 오류 표시
  - git 초기화가 안 된 경우 `git init` 실행 여부 사용자 확인 후 수행
```

#### 3.2.6 LLM 설정

```
기능명: LLM 설정

설명:
  Extension 내 설정 패널에서 LLM provider, 모델, API 키를 구성한다.
  설정값은 workspace의 `.env` 파일에 저장되며 .gitignore에 자동 포함된다.
  API 키 검증 버튼으로 연결 테스트 가능.

입력:
  - LLM_PROVIDER: anthropic | openai
  - LLM_MODEL: 모델명 (예: claude-sonnet-4-6, gpt-4o)
  - LLM_API_KEY: API 시크릿 키
  - LLM_BASE_URL: (선택) 커스텀 엔드포인트

출력/결과:
  - `.env` 파일 생성/업데이트
  - API 검증 성공/실패 메시지

예외/에러 케이스:
  - API 키 형식 오류 시 저장 전 경고
  - 연결 테스트 실패 시 구체적인 오류 원인 표시 (401: 인증 실패, 429: 한도 초과 등)
  - .env 파일 직접 편집 시 Extension에서 자동으로 재로드
```

---

## 4. 비기능 요구사항(Non-functional Requirements)

### 4.1 성능(Performance)

| 항목 | 기준 |
|------|------|
| Webview UI 상호작용 응답 | < 100ms |
| PRD 저장/로드 | < 500ms |
| LLM Task 추출 (스트리밍) | 첫 토큰 출력 < 3초, 전체 완료 기준 없음 |
| Configure 파일 생성 | LLM 호출 포함 전체 < 60초 |
| 프로젝트 목록 로드 | < 200ms |

LLM API 호출은 반드시 스트리밍(streaming) 방식으로 진행하여 사용자가 실시간으로 진행 상황을 확인할 수 있어야 한다.

### 4.2 보안(Security)

- **API 키**: `.env` 파일에만 저장. Extension 메모리에 키를 캐시할 경우 세션 종료 시 제거.
- **git 보호**: `.env`, `.ralph/`, `*.secret` 패턴은 Configure 시 자동으로 `.gitignore`에 추가.
- **Webview CSP**: Content Security Policy를 적용하여 외부 리소스 로딩 차단.
- **데이터 로컬 저장**: 사용자 프로젝트 데이터는 로컬 파일 시스템에만 저장. 클라우드 전송 없음.
- **인증**: 별도 인증/인가 불필요 (단일 사용자, 로컬 도구).

### 4.3 안정성·가용성(Reliability & Availability)

- **자동 임시저장**: PRD 편집 중 30초 간격으로 Extension Storage에 자동저장.
- **LLM 재시도**: API 호출 실패(5xx, 타임아웃) 시 최대 3회 자동 재시도 (지수 백오프).
- **파일 충돌**: 저장 대상 파일이 이미 존재하는 경우 덮어쓰기 전 사용자 확인.
- **상태 복원**: VSCode 재시작 후 마지막으로 열린 프로젝트 자동 복원.

### 4.4 호환성 및 접근성

- **VSCode 버전**: 1.85.0 이상
- **OS**: Windows 10+, macOS 12+, Ubuntu 20.04+
- **Node.js**: 18+ (Extension Host 런타임)
- **쉘 스크립트**: bash 기반. Windows에서는 Git Bash 또는 WSL 필요. PowerShell 대안 스크립트 제공 여부는 Open Issue.
- **접근성**: VSCode Webview UI Toolkit의 기본 접근성 준수 (키보드 탐색, 스크린 리더 호환)

---

## 5. 시스템 및 연동

### 5.1 아키텍처 개요

```
┌─────────────────────────────────────────────────────┐
│                 VSCode Extension Host                │
│  (Node.js / TypeScript)                             │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Project Mgr │  │  LLM Service │  │ File I/O  │  │
│  │             │  │  (API Client)│  │  Service  │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                │                │         │
│  ┌──────▼────────────────▼────────────────▼──────┐  │
│  │           Webview Message Bridge               │  │
│  └──────────────────────┬────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          │ postMessage / onMessage
┌─────────────────────────▼───────────────────────────┐
│                   Webview Panel                     │
│  (React + @vscode/webview-ui-toolkit)               │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ PRD      │  │ Task /   │  │ Loop Config      │  │
│  │ Editor   │  │ Plan     │  │ & Configure      │  │
│  │          │  │ Editor   │  │ Panel            │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
  Anthropic API     File System       VSCode Terminal
  (Claude SDK)   (vibe_context/)     (run_project.sh)
```

### 5.2 연동 시스템/외부 API

| 시스템 | 목적 | 인터페이스 | 주요 설정 |
|--------|------|------------|-----------|
| Anthropic Claude API | Task 추출, Plan 생성, project_prompt.md 작성 | REST (HTTPS), streaming | LLM_API_KEY, LLM_MODEL |
| OpenAI API (선택) | 위 동일 (provider 교체 시) | REST (HTTPS), streaming | LLM_API_KEY, LLM_BASE_URL |
| VSCode 파일 시스템 API | PRD/Tasks/Plan 파일 읽기·쓰기 | vscode.workspace.fs | workspace root |
| VSCode Terminal API | run_project.sh, run_loop.sh 실행 | vscode.window.createTerminal | bash / Git Bash |
| git CLI | 초기 커밋, remote push | 쉘 실행 | workspace git 설정 |

**오류/타임아웃 처리:**
- LLM API: 60초 타임아웃, 5xx 오류 시 3회 재시도 (지수 백오프: 2s, 4s, 8s)
- 파일 I/O: 즉시 실패 처리 후 사용자 알림
- 터미널 실행: 스크립트 실행 오류는 터미널 출력으로 확인

### 5.3 기술 제약

- **런타임**: VSCode Extension Host (Node.js 18+). 브라우저 API 사용 불가.
- **UI**: VSCode Webview Panel. DOM 직접 접근 없음. `@vscode/webview-ui-toolkit` 사용.
- **보안**: Webview는 별도 origin에서 실행. Extension Host ↔ Webview 통신은 `postMessage`만 사용.
- **파일 접근**: VSCode API(`vscode.workspace.fs`)를 통해서만 파일 접근. 직접 `fs` 사용 최소화.
- **LLM SDK**: `@anthropic-ai/sdk` (Anthropic), `openai` (OpenAI). `.env` 파일로 전환.

---

## 6. 수용 기준(Acceptance Criteria) 및 테스트

### 6.1 스토리별 수용 기준

```
[AC-US-001-1] 새 프로젝트 생성
Given: Extension이 실행되어 프로젝트 목록 화면이 표시된 상태
When: "New Project" 버튼 클릭 → 프로젝트명 입력 → 확인
Then:
  - 새 프로젝트가 목록에 추가된다
  - PRD 편집 화면이 메인 패널에 열린다
  - vibe_context/ 디렉토리가 workspace에 생성된다

[AC-US-006-1] PRD 저장
Given: PRD 편집 화면에서 프로젝트명, 목적, User Story 1개 이상이 입력된 상태
When: "Save PRD" 버튼 클릭
Then:
  - {workspace}/vibe_context/PRD.md 파일이 생성된다
  - 파일 내용이 부록 §3의 형식을 따른다
  - 저장 성공 토스트 메시지가 표시된다

[AC-US-008-1] Task 추출
Given: PRD가 저장된 상태
When: "Extract Tasks" 버튼 클릭
Then:
  - LLM이 호출되고 스트리밍으로 Task가 실시간 표시된다
  - Task 편집 화면이 PRD 화면과 별개의 탭/패널로 열린다
  - 추출된 Task에 순번이 부여된다

[AC-US-012-1] Ralph Loop 종료 조건 필수 입력
Given: Plan이 작성되고 Task 구간이 선택된 상태
When: "Group for Ralph Loop" 버튼 클릭 → 종료 조건 입력하지 않고 확인
Then:
  - 저장이 차단된다
  - "종료 조건을 반드시 입력하세요" 경고가 표시된다

[AC-US-013-1] Configure 산출물 생성
Given: PRD, Tasks, Plan, Loop 종료 조건이 모두 완료된 상태
When: "Configure" 버튼 클릭 → 확인
Then:
  - project_prompt.md, run_project.sh, run_loop.sh, feature_list.json이 생성된다
  - feature_list.json의 모든 항목이 passes: false로 초기화된다
  - .gitignore에 .env, .ralph/가 포함된다

[AC-US-015-1] LLM API 키 검증
Given: 설정 패널에서 LLM_PROVIDER=anthropic, LLM_API_KEY 입력 완료
When: "Test Connection" 버튼 클릭
Then:
  - 유효한 키: "연결 성공" 메시지 표시
  - 잘못된 키: "401 인증 실패" 메시지 표시
  - 네트워크 오류: "연결 실패 - 네트워크를 확인하세요" 메시지 표시
```

### 6.2 테스트 관점(High-level Test Plan)

- **기능 테스트**: 각 User Story별 수용 기준 검증. Extension Development Host에서 수동 E2E 테스트.
- **LLM 연동 테스트**: 실제 API 키로 Task 추출, Plan 생성, project_prompt.md 생성 품질 검증.
- **파일 생성 테스트**: Configure 실행 후 생성된 파일의 형식 및 내용 검증.
- **에러 케이스 테스트**: API 타임아웃, 파일 권한 오류, 필수 항목 미입력 시 동작 검증.
- **OS 호환성 테스트**: Windows(Git Bash), macOS, Ubuntu에서 run_project.sh 실행 검증.

---

## 7. 론칭 및 운영 계획

### 7.1 배포/롤아웃 전략

- **초기 배포**: `.vsix` 파일로 패키징하여 사내 개발자에게 로컬 설치 (`Extensions: Install from VSIX`).
- **버전 관리**: Semantic Versioning (0.1.x: 초기 MVP, 0.x: 기능 추가, 1.0: 안정화).
- **VS Code Marketplace 게시**: 안정화 이후 검토. 현재 릴리즈에서는 제외.
- **롤백 전략**: 이전 .vsix 버전으로 재설치. Extension Storage 데이터는 마이그레이션 스크립트 제공.

### 7.2 모니터링 및 지표

- **Extension 오류 로그**: VSCode Output Channel("Agent Harness Framework")에 오류 기록.
- **LLM 사용량 추적**: API 호출 횟수, 토큰 수 로컬 로그 기록 (`vibe_context/usage.log`).
- **주요 관찰 지표**: Configure 성공률, LLM API 오류율, Task 추출 품질 (사용자 편집 비율).
- **알람 기준**: LLM API 연속 3회 실패 시 UI에 경고 배너 표시.

### 7.3 커뮤니케이션

- **릴리즈 노트**: CHANGELOG.md에 버전별 변경 사항 기록.
- **사내 가이드**: 사용 방법 및 ralph loop 설정 가이드 문서 (README.md 또는 별도 위키).
- **피드백 수집**: GitHub Issues 또는 사내 채널을 통한 버그 리포트 및 기능 요청.

---

## 8. 리스크 및 오픈 이슈

### 8.1 리스크 목록

```
[Risk-001] LLM API 비용 증가
- 설명: PRD가 길어질수록 Task 추출, Plan 생성, project_prompt.md 작성 시 토큰 소비 증가.
- 영향도: 중간 (사용자 부담 비용 증가)
- 대응 계획: 사용자 자체 API 키 사용 방식 유지. 불필요한 중복 호출 최소화. 토큰 사용량 로컬 추적.

[Risk-002] 생성된 project_prompt.md 품질 불확실성
- 설명: LLM이 생성한 Initializer Agent 프롬프트가 실제 에이전트 실행 시 의도한 대로 동작하지 않을 수 있음.
- 영향도: 높음 (핵심 기능의 성패를 좌우)
- 대응 계획: 생성 후 사용자 검토/편집 단계 필수화. 검증된 프롬프트 템플릿 라이브러리 제공.

[Risk-003] Windows 환경에서의 쉘 스크립트 실행
- 설명: run_project.sh, run_loop.sh가 bash 기반으로 Windows 기본 환경에서 실행 불가.
- 영향도: 높음 (주 타겟 사용자 환경)
- 대응 계획: Git Bash 사용 안내. WSL 감지 시 자동 전환. PowerShell 대안 스크립트 제공 여부는 Open Issue.

[Risk-004] VSCode Extension API 변경
- 설명: VSCode 업데이트로 Webview API, 파일 시스템 API 등이 변경될 수 있음.
- 영향도: 낮음 (주요 API는 안정적)
- 대응 계획: 안정화된 API만 사용. `engines.vscode` 버전 범위를 보수적으로 지정.

[Risk-005] Ralph Loop 무한 실행으로 인한 비용 폭주
- 설명: 종료 조건이 충족되지 않을 경우 루프가 무한 실행되어 API 비용이 급증할 수 있음.
- 영향도: 높음
- 대응 계획: 최대 반복 횟수(Max iterations) 설정을 선택적 옵션으로 제공. Gutter 감지(동일 명령 3회 실패)시 루프 자동 중단.
```

### 8.2 오픈 이슈(Open Questions)

```
[Issue-001] Graph 기반 워크플로 UI 구현 여부
- 질문: n8n/Dify 스타일의 Graph UI를 이번 릴리즈에 포함할 것인가, 후속 릴리즈로 미룰 것인가?
- 현재 방향: 계층형 리스트 UI로 MVP 구현 후 Graph UI는 v2에서 검토
- 담당자: 이원준
- 결정 기한: 2026-04-01
- Status: Open

[Issue-002] 지원 LLM Provider 범위
- 질문: Anthropic만 지원할 것인가, OpenAI도 포함할 것인가? 사내 온프레미스 LLM 지원은?
- 현재 방향: Anthropic 기본, OpenAI 선택적 지원. 온프레미스는 LLM_BASE_URL 커스텀으로 대응 가능하도록 설계
- 담당자: 이원준
- 결정 기한: 2026-04-01
- Status: Open

[Issue-003] Windows PowerShell 대안 스크립트 제공 여부
- 질문: Git Bash 없는 Windows 환경을 위한 PowerShell 스크립트(run_project.ps1)를 제공할 것인가?
- 담당자: 이원준
- 결정 기한: 2026-04-15
- Status: Open

[Issue-004] 프로젝트 데이터 저장 위치
- 질문: 프로젝트 메타데이터(목록, 설정 등)를 Extension Global Storage에 저장할 것인가,
       workspace의 .vscode/agent-harness.json에 저장할 것인가?
- 현재 방향: 프로젝트 목록은 Extension Global Storage, 프로젝트 내용은 workspace vibe_context/
- 담당자: 이원준
- 결정 기한: 2026-04-01
- Status: Open

[Issue-005] feature_list.json의 테스트 항목 자동 생성 상세도
- 질문: feature_list.json의 각 기능 항목에 포함되는 검증 steps를 얼마나 상세하게 자동 생성할 것인가?
       (부록 §1의 예시처럼 navigator steps를 포함하는 방식)
- 담당자: 이원준
- 결정 기한: 2026-04-15
- Status: Open
```

---

# 부록

## 1. Effective harnesses for long-running agents

본 프로젝트에서 가장 중요한 가이드라인입니다. 반드시 이 가이드라인을 기반으로 하네스 프레임워크가 개발되어야 합니다.

Agents still face challenges working across many context windows. We looked to human engineers for inspiration in creating a more effective harness for long-running agents.

As AI agents become more capable, developers are increasingly asking them to take on complex tasks requiring work that spans hours, or even days. However, getting agents to make consistent progress across multiple context windows remains an open problem.

The core challenge of long-running agents is that they must work in discrete sessions, and each new session begins with no memory of what came before. Imagine a software project staffed by engineers working in shifts, where each new engineer arrives with no memory of what happened on the previous shift. Because context windows are limited, and because most complex projects cannot be completed within a single window, agents need a way to bridge the gap between coding sessions.

We developed a two-fold solution to enable the Claude Agent SDK to work effectively across many context windows: an initializer agent that sets up the environment on the first run, and a coding agent that is tasked with making incremental progress in every session, while leaving clear artifacts for the next session. You can find code examples in the accompanying quickstart.

The long-running agent problem
The Claude Agent SDK is a powerful, general-purpose agent harness adept at coding, as well as other tasks that require the model to use tools to gather context, plan, and execute. It has context management capabilities such as compaction, which enables an agent to work on a task without exhausting the context window. Theoretically, given this setup, it should be possible for an agent to continue to do useful work for an arbitrarily long time.

However, compaction isn't sufficient. Out of the box, even a frontier coding model like Opus 4.6 running on the Claude Agent SDK in a loop across multiple context windows will fall short of building a production-quality web app if it's only given a high-level prompt, such as "build a clone of claude.ai."

Claude's failures manifested in two patterns. First, the agent tended to try to do too much at once—essentially to attempt to one-shot the app. Often, this led to the model running out of context in the middle of its implementation, leaving the next session to start with a feature half-implemented and undocumented. The agent would then have to guess at what had happened, and spend substantial time trying to get the basic app working again. This happens even with compaction, which doesn't always pass perfectly clear instructions to the next agent.

A second failure mode would often occur later in a project. After some features had already been built, a later agent instance would look around, see that progress had been made, and declare the job done.

This decomposes the problem into two parts. First, we need to set up an initial environment that lays the foundation for all the features that a given prompt requires, which sets up the agent to work step-by-step and feature-by-feature. Second, we should prompt each agent to make incremental progress towards its goal while also leaving the environment in a clean state at the end of a session. By "clean state" we mean the kind of code that would be appropriate for merging to a main branch: there are no major bugs, the code is orderly and well-documented, and in general, a developer could easily begin work on a new feature without first having to clean up an unrelated mess.

When experimenting internally, we addressed these problems using a two-part solution:

Initializer agent: The very first agent session uses a specialized prompt that asks the model to set up the initial environment: an init.sh script, a claude-progress.txt file that keeps a log of what agents have done, and an initial git commit that shows what files were added.
Coding agent: Every subsequent session asks the model to make incremental progress, then leave structured updates.

The key insight here was finding a way for agents to quickly understand the state of work when starting with a fresh context window, which is accomplished with the claude-progress.txt file alongside the git history. Inspiration for these practices came from knowing what effective software engineers do every day.

Environment management
In the updated Claude 4 prompting guide, we shared some best practices for multi-context window workflows, including a harness structure that uses "a different prompt for the very first context window." This "different prompt" requests that the initializer agent set up the environment with all the necessary context that future coding agents will need to work effectively. Here, we provide a deeper dive on some of the key components of such an environment.

Feature list
To address the problem of the agent one-shotting an app or prematurely considering the project complete, we prompted the initializer agent to write a comprehensive file of feature requirements expanding on the user's initial prompt. In the claude.ai clone example, this meant over 200 features, such as "a user can open a new chat, type in a query, press enter, and see an AI response." These features were all initially marked as "failing" so that later coding agents would have a clear outline of what full functionality looked like.

```json
{
  "category": "functional",
  "description": "New chat button creates a fresh conversation",
  "steps": [
    "Navigate to main interface",
    "Click the 'New Chat' button",
    "Verify a new conversation is created",
    "Check that chat area shows welcome state",
    "Verify conversation appears in sidebar"
  ],
  "passes": false
}
```

We prompt coding agents to edit this file only by changing the status of a passes field, and we use strongly-worded instructions like "It is unacceptable to remove or edit tests because this could lead to missing or buggy functionality." After some experimentation, we landed on using JSON for this, as the model is less likely to inappropriately change or overwrite JSON files compared to Markdown files.

Incremental progress
Given this initial environment scaffolding, the next iteration of the coding agent was then asked to work on only one feature at a time. This incremental approach turned out to be critical to addressing the agent's tendency to do too much at once.

Once working incrementally, it's still essential that the model leaves the environment in a clean state after making a code change. In our experiments, we found that the best way to elicit this behavior was to ask the model to commit its progress to git with descriptive commit messages and to write summaries of its progress in a progress file. This allowed the model to use git to revert bad code changes and recover working states of the code base.

These approaches also increased efficiency, as they eliminated the need for an agent to have to guess at what had happened and spend its time trying to get the basic app working again.

Testing
One final major failure mode that we observed was Claude's tendency to mark a feature as complete without proper testing. Absent explicit prompting, Claude tended to make code changes, and even do testing with unit tests or curl commands against a development server, but would fail recognize that the feature didn't work end-to-end.

In the case of building a web app, Claude mostly did well at verifying features end-to-end once explicitly prompted to use browser automation tools and do all testing as a human user would.

Providing Claude with these kinds of testing tools dramatically improved performance, as the agent was able to identify and fix bugs that weren't obvious from the code alone.

Some issues remain, like limitations to Claude's vision and to browser automation tools making it difficult to identify every kind of bug. For example, Claude can't see browser-native alert modals through the Puppeteer MCP, and features relying on these modals tended to be buggier as a result.

Getting up to speed
With all of the above in place, every coding agent is prompted to run through a series of steps to get its bearings, some quite basic but still helpful:

Run pwd to see the directory you're working in. You'll only be able to edit files in this directory.
Read the git logs and progress files to get up to speed on what was recently worked on.
Read the features list file and choose the highest-priority feature that's not yet done to work on.
This approach saves Claude some tokens in every session since it doesn't have to figure out how to test the code. It also helps to ask the initializer agent to write an init.sh script that can run the development server, and then run through a basic end-to-end test before implementing a new feature.

In the case of the claude.ai clone, this meant that the agent always started the local development server and used the Puppeteer MCP to start a new chat, send a message, and receive a response. This ensured that Claude could quickly identify if the app had been left in a broken state, and immediately fix any existing bugs. If the agent had instead started implementing a new feature, it would likely make the problem worse.

Given all this, a typical session starts off with the following assistant messages:

```
[Assistant] I'll start by getting my bearings and understanding the current state of the project.
[Tool Use] <bash - pwd>
[Tool Use] <read - claude-progress.txt>
[Tool Use] <read - feature_list.json>
[Assistant] Let me check the git log to see recent work.
[Tool Use] <bash - git log --oneline -20>
[Assistant] Now let me check if there's an init.sh script to restart the servers.
<Starts the development server>
[Assistant] Excellent! Now let me navigate to the application and verify that some fundamental features are still working.
<Tests basic functionality>
[Assistant] Based on my verification testing, I can see that the fundamental functionality is working well. The core chat features, theme switching, conversation loading, and error handling are all functioning correctly. Now let me review the tests.json file more comprehensively to understand what needs to be implemented next.
<Starts work on a new feature>
```

## 2. Ralph loop

2026년이 시작된 지 일주일도 안 되어, 테크 트위터는 "랄프 위검 루프(Ralph Wiggum Loop)"에 대한 논의로 뜨겁게 달아올랐다. 심슨 가족의 "I'm in danger" 밈으로 유명한 그 사랑스럽게 끈질긴 캐릭터의 이름을 딴 이 기법은, 우리가 자율 AI 개발에 대해 생각하는 방식에 도전장을 내밀고 있다.

Geoffrey Huntley가 처음 만든 이 기법은 놀랍도록 단순하면서도 강력하다:

```bash
while :; do cat PROMPT.md | agent ; done
```

이게 전부다. AI 코딩 에이전트에 같은 프롬프트를 반복적으로 넣는 무한 루프.

핵심은 이것이다: 진행 상황은 LLM의 컨텍스트 윈도우에 저장되지 않는다. 대신 파일과 git 히스토리에 저장된다. 컨텍스트가 꽉 차면, 새로운 에이전트가 새 컨텍스트로 시작해서 이전 에이전트가 멈춘 곳에서 이어받는다.

Huntley의 표현: "그게 랄프의 아름다움이다 - 이 기법은 비결정론적 세계에서 결정론적으로 나쁘다."

랄프가 해결하는 문제
malloc/free 문제
전통적인 LLM 대화는 Huntley가 "malloc/free 문제"라고 부르는 것을 겪는다:

전통적 프로그래밍 LLM 컨텍스트
메모리를 malloc()으로 할당 파일 읽기, 도구 출력, 대화 히스토리가 malloc처럼 작동
완료 후 free()로 해제 free()가 없다 — 선택적으로 컨텍스트를 해제할 수 없음
컨텍스트 오염(Context Pollution)
실패한 시도, 관련 없는 코드, 혼합된 관심사가 축적되면 모델이 혼란에 빠진다. 한번 오염되면, 모델은 계속 나쁜 컨텍스트를 참조한다. 마치 볼링공이 거터에 빠지면 구할 방법이 없는 것처럼.

랄프의 해결책
오염이 쌓이기 전에 의도적으로 새 컨텍스트로 교체한다. 상태는 LLM의 메모리가 아니라 파일과 git에 저장된다.

작동 방식: 대규모 컨텍스트 관리
구현은 단순한 루프보다 훨씬 정교하다:

```
┌─────────────────────────────────────────────┐
│            run_loop.sh                       │
│                 ▼                            │
│  claude --output-format stream-json          │
│                 ▼                            │
│          stream-parser.sh                    │
│         │              │                     │
│         ▼              ▼                     │
│    .ralph/         Signals                   │
│    ├── progress.md   ├── 70k 토큰에서 WARN  │
│    ├── guardrails.md ├── 80k에서 ROTATE     │
│    └── activity.log  └── GUTTER 감지        │
│                                              │
│  ROTATE 시 → 상태와 함께 새 컨텍스트         │
└─────────────────────────────────────────────┘
```

핵심 기능들
- 정확한 토큰 추적 — 모든 파일 읽기/쓰기의 실제 바이트 수 계산
- 거터 감지 — 에이전트가 막혔는지 식별 (같은 명령 3회 실패, 파일 thrashing)
- 실패에서 학습 — 에이전트가 배운 교훈으로 guardrails.md 업데이트
- git에 상태 저장 — 빈번한 커밋으로 다음 에이전트가 매끄럽게 이어받음

각 반복의 상태
| 토큰 사용량 | 상태 | 행동 |
|------------|------|------|
| < 60% | 🟢 건강 | 에이전트가 자유롭게 작업 |
| 60-80% | 🟡 경고 | 현재 작업을 마무리하라는 신호 |
| > 80% | 🔴 위험 | 강제로 새 컨텍스트로 교체 |

학습 루프: 지속되는 "표지판"
랄프의 가장 영리한 기능 중 하나는 가드레일 시스템이다. 무언가 실패하면, 에이전트가 `.ralph/guardrails.md`에 "표지판(Sign)"을 추가한다:

```
### Sign: 추가하기 전에 import 확인
- **트리거**: 새 import 문 추가 시
- **지시**: 먼저 파일에 import가 이미 존재하는지 확인
- **추가 시점**: 반복 3 - 중복 import가 빌드 실패 유발
```

미래의 반복들은 이 가드레일을 먼저 읽고 따른다. 같은 실수를 반복하지 않게 되는 것이다. 컨텍스트 교체를 넘어 지속되는 단순하지만 효과적인 에이전트 메모리 형태다.

## 3. PRD 구성요소 (Extension이 생성하는 PRD 템플릿)

본 섹션은 Agent Harness Framework Extension이 사용자의 프로젝트를 위해 생성하는 PRD 문서의 표준 양식입니다.

```
PRD: <프로젝트 / 기능 이름>
문서 ID:
버전:
상태: Draft | In Review | Approved
작성일:
작성자:
관련 저장소/서비스:

1. 개요 (Overview)
   1.1 목적 (Goal)
   제품/기능의 최종 목적 1줄:
   해결하려는 핵심 문제 요약:

   1.2 배경 (Background)
   현재 상황(As-Is) 요약:
   비즈니스/운영 상의 Pain Point:
   왜 지금 이 기능이 필요한지:

   1.3 범위 (Scope)
   이번 릴리즈에 포함되는 것(In scope):
   이번 릴리즈에서 제외되는 것(Out of scope):

2. 이해관계자 및 대상 사용자
   2.1 이해관계자 (Stakeholders)
   Product Owner:
   Tech Lead / Architect:
   Backend, Frontend, Infra 담당자:
   기타(운영, CS 등):

   2.2 대상 사용자 (Personas)
   [Persona-1]
   - 이름(라벨):
   - 역할/직무:
   - 사용 디바이스/채널:
   - 주요 목표:
   - 주요 Pain Point:

3. 사용자 여정 & 시나리오
   3.1 전체 플로우 요약 (User Journey)
   시작 지점(Entry Point):
   주요 단계(High-level Steps):
   종료 지점(Exit Point):

   3.2 시나리오별 상세 (User Scenarios)
   [Scenario-1]
   - Persona:
   - 트리거(Trigger):
   - 기본 흐름(Main Flow):
   - 대안 흐름(Alternate Flow / Edge Case):
   - 기대 결과(Expected Outcome):

4. 사용자 스토리 (User Stories)
   [US-001]
   - As: (어떤 사용자 / 역할)
   - I want: (무엇을 하고 싶은지, 행동 단위로)
   - So that: (얻고 싶은 가치/효과)
   - Priority: Must | Should | Could | Won't
   - Status: Planned | In Progress | Done
   - Related Scenarios: [Scenario-1]
   - Related APIs: [API-001]
   - Related Business Rules: [BR-001]

5. 비즈니스 규칙 (Business Rules)
   [BR-001]
   - Name:
   - Description:
   - Condition:
   - Action:
   - Exceptions:
   - Applies To: (User Stories, APIs)

6. 기능 요구사항 상세 (Functional Specs)
   6.1 기능 목록
   [Feature-001]
   - Name:
   - Summary:
   - Related User Stories:
   - Entry Points:
   - Exit Conditions:

   6.2 화면/상호작용 관점
   [UI-001]
   - Name:
   - Entry:
   - Elements:
   - Events:
   - Navigation:

7. API / 백엔드 명세
   [API-001]
   - Name:
   - Method:
   - Path:
   - Description:
   - Query Parameters:
   - Request Body:
   - Response (200):
   - Error Responses:
   - Related Business Rules:
   - Related User Stories:

8. 데이터 모델 (Domain Model)
   [Entity: EntityName]
   - Table:
   - Fields:
   - Relations:

9. 비기능 요구사항 (Non-functional Requirements)
   9.1 성능: API별 요구 응답 시간(SLA)
   9.2 보안: 인증 방식, 인가 정책, 민감 정보 처리
   9.3 가용성/운영: 목표 가용성, 장애/복구 기준, 로그/모니터링

10. 워크플로/Agent 관점 정의
    [Agent-Flow-001]
    - Trigger:
    - Steps: (노드 타입, Input/Output, 조건)
    - Guardrails:

11. 수용 기준 (Acceptance Criteria)
    [AC-US-001-1]
    - Related User Story: [US-001]
    - Given:
    - When:
    - Then:

12. 리스크 & 오픈 이슈
    12.1 리스크
    [Risk-001]
    - Description:
    - Impact:
    - Likelihood: Low | Medium | High
    - Mitigation Plan:

    12.2 오픈 이슈
    [Issue-001]
    - Question:
    - Owner:
    - Due Date:
    - Status: Open | Resolved
```
