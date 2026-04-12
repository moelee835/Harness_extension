# Configure Loop

Ralph Loop 기반 장기 에이전트 하네스를 현재 프로젝트에 설정합니다.
AGENTS.md, IMPLEMENTATION_PLAN.md, PROMPT_plan.md, PROMPT_build.md, loop.sh를 생성하여
반복 실행 루프를 즉시 구동할 수 있는 환경을 만듭니다.

---

## 필수 선행 독해

**이 커맨드를 실행하기 전에 반드시 아래 문서를 읽어야 합니다.**

`.claude/external_knowledges/ralph_longterm_combined.md` 를 전체 읽습니다.

이 문서는 Ralph Loop 방법론(Geoffrey Huntley / Clayton Farr)과 Anthropic의 장기 에이전트 패턴을 통합한 설계 보고서입니다.
이 커맨드의 모든 단계, 파일 구조, 운영 원칙은 해당 문서에서 도출됩니다.
문서를 읽지 않고 아래 단계를 수행하면 방법론의 의도를 놓치게 됩니다.

---

## 전제 조건

**`specs/features.json`이 반드시 먼저 존재해야 합니다.**

이 파일이 없으면 이 커맨드를 실행할 수 없습니다.
`/extract_features_json` 커맨드를 먼저 실행하여 기능 목록을 생성하십시오.

`specs/features.json`이 존재하는지 확인합니다. 없으면 즉시 중단하고 다음 메시지를 출력합니다:

> `specs/features.json`이 없습니다. 먼저 `/extract_features_json`을 실행하여 기능 목록을 생성하세요.

---

## 사전 확인

전제 조건이 충족되면, 아래 파일들의 존재 여부를 확인합니다.

1. `AGENTS.md` — 빌드·검증 명령 문서
2. `IMPLEMENTATION_PLAN.md` — 진행 상황 추적 파일
3. `PROMPT_plan.md` — Initializer Agent 참조 프롬프트
4. `PROMPT_build.md` — Coding Agent 프롬프트
5. `loop.sh` — 외부 반복 실행 루프

각 파일이 없으면 아래 단계에 따라 생성합니다.
이미 존재하는 파일은 내용을 읽어 확인한 뒤, 현재 프로젝트 상태와 맞지 않는 부분만 업데이트합니다.

---

## Steps

### Step 1 — 기술 스택 조사

이 단계의 목적은 프로젝트에서 사용하는 언어·프레임워크·빌드 도구를 파악하고,
이후 AGENTS.md와 PROMPT_build.md에 삽입할 **실제 검증 명령**을 확정하는 것입니다.

#### 1-a. 언어·런타임 감지

아래 파일들 중 존재하는 것을 읽어 사용 언어와 런타임을 파악합니다.

| 감지 파일 | 의미 |
|-----------|------|
| `package.json` | Node.js / JavaScript / TypeScript |
| `pyproject.toml`, `setup.py`, `requirements.txt` | Python |
| `Cargo.toml` | Rust |
| `go.mod` | Go |
| `pom.xml`, `build.gradle` | Java / Kotlin |
| `*.csproj`, `*.sln` | C# / .NET |
| `pubspec.yaml` | Dart / Flutter |
| `mix.exs` | Elixir |
| `Gemfile` | Ruby |
| `composer.json` | PHP |

여러 파일이 존재하면 모두 읽어 주요 언어를 결정합니다.

#### 1-b. 빌드·검증 명령 목록 작성

감지된 언어를 기준으로 아래 표에서 해당 도구 조합을 파악합니다.
파악한 명령은 변수로 기록하여 이후 단계에서 재사용합니다.

| 언어 / 도구 | 타입 체크 | 린트 | 단위 테스트 | 빌드 |
|-------------|-----------|------|-------------|------|
| **Node.js + TypeScript** | `npm run check-types` (또는 `tsc --noEmit`) | `npm run lint` (ESLint) | `npm test` | `npm run build` 또는 `npm run compile` |
| **Node.js + JavaScript** | — | `npm run lint` (ESLint/Prettier) | `npm test` | `npm run build` |
| **Python (pytest)** | `mypy .` 또는 `pyright` | `ruff check .` 또는 `flake8` | `pytest` | `python -m build` 또는 해당 없음 |
| **Rust** | `cargo check` | `cargo clippy` | `cargo test` | `cargo build --release` |
| **Go** | `go vet ./...` | `golangci-lint run` | `go test ./...` | `go build ./...` |
| **Java (Maven)** | — | `mvn checkstyle:check` | `mvn test` | `mvn package` |
| **Java (Gradle)** | — | `./gradlew checkstyleMain` | `./gradlew test` | `./gradlew build` |
| **C# (.NET)** | `dotnet build` (포함) | — | `dotnet test` | `dotnet build` |
| **Dart / Flutter** | `dart analyze` | `dart format --set-exit-if-changed .` | `flutter test` 또는 `dart test` | `flutter build` |
| **Ruby** | — | `rubocop` | `bundle exec rspec` 또는 `rake test` | — |
| **PHP** | `vendor/bin/phpstan analyse` | `vendor/bin/phpcs` | `vendor/bin/phpunit` | — |

표에 없는 언어·도구는 `package.json`의 `scripts` 섹션, `Makefile`, `justfile`, `taskfile.yml` 등을 읽어 직접 파악합니다.

#### 1-c. 프레임워크별 추가 규칙 파악

감지된 프레임워크에 따라 아래 특수 규칙을 추가로 파악합니다.

- **VSCode Extension**: `dist/` 직접 편집 금지, `vscode` 모듈 번들 외부 처리, `context.subscriptions.push()` 필수, `package.json#contributes.commands`와 `registerCommand` ID 일치
- **React / Vue / Svelte**: 컴포넌트 단위 테스트, 스냅샷 테스트 주의
- **FastAPI / Django / Flask**: DB 마이그레이션 상태 확인 필요, 환경변수 파일(`.env`) 존재 여부 확인
- **Flutter**: `flutter pub get` 선행 필요, 플랫폼별 빌드 커맨드 분리
- **Rust**: `unsafe` 사용 시 주석 의무, `cargo fmt` 자동 포맷 필요

#### 1-d. 기술 스택 요약 기록

파악한 내용을 아래 형식으로 메모합니다 (이후 단계에서 참조).

```
[기술 스택 요약]
언어: <감지된 언어 및 버전>
런타임: <Node.js 22 / Python 3.12 / Rust 1.80 / ...>
프레임워크: <VSCode Extension / React / FastAPI / ...>
빌드 도구: <esbuild / webpack / cargo / gradle / ...>

[검증 게이트 — 이 순서로 실행]
① 타입 체크: <명령 또는 "해당 없음">
② 린트:      <명령>
③ 테스트:    <명령>
④ 빌드:      <명령 또는 "해당 없음">

[세션 스모크 체크 — 매 반복 시작 시]
<타입 체크> && <린트> && <빌드>

[프레임워크 특수 규칙]
- <파악된 규칙 목록>
```

---

### Step 2 — 현재 프로젝트 상태 파악

1. `specs/features.json`을 읽어 전체 기능 목록과 각 항목의 `passes` 상태를 파악합니다.
   - `passes: false` 항목 수 = 미구현 기능
   - `passes: true` 항목 수 = 구현 완료 기능
2. `git log --oneline -10`을 실행하여 최근 커밋 히스토리를 확인합니다.
3. `.claude/MEMORY.md`를 읽어 이전 세션 맥락을 파악합니다.

---

### Step 3 — AGENTS.md 생성 또는 갱신

`AGENTS.md`가 없으면 Step 1에서 파악한 기술 스택 정보를 사용하여 아래 형식으로 생성합니다.
이미 있으면 내용을 읽은 뒤, Step 1의 검증 게이트와 불일치하는 부분만 수정합니다.

생성할 내용 형식 (꺽쇠 항목은 Step 1 결과로 채울 것):

```markdown
# AGENTS.md

이 파일은 Ralph Loop 기반 Coding Agent가 매 세션 시작 시 반드시 읽어야 합니다.
빌드·검증 명령과 운영 규칙을 기술합니다.

## 프로젝트 개요

<프로젝트 한 줄 설명>
언어: <언어 및 버전>  |  런타임: <런타임>  |  프레임워크: <프레임워크>

## 검증 명령 (반드시 이 순서로 실행)

1. <타입 체크 명령>  — <도구명 및 역할>
2. <린트 명령>       — <도구명 및 역할>
3. <테스트 명령>     — <테스트 프레임워크 및 범위>
4. <빌드 명령>       — <빌드 도구 및 출력물>

> 모든 명령이 exit code 0으로 종료될 때만 커밋 허용.
> 단 하나라도 실패하면 에러를 읽고 수정 후 처음부터 재실행.
> 해당 없는 단계(예: 동적 언어의 타입 체크)는 건너뜁니다.

## 세션 시작 시 스모크 체크

매 세션 시작 시 반드시 실행:
<스모크 체크 명령 (타입 체크 && 린트 && 빌드)>

> 스모크 체크 실패 시 새 기능 구현 전에 반드시 수정 먼저.

## 운영 규칙

- 한 번에 하나의 기능만 구현할 것 (specs/features.json의 우선순위 순)
- 모든 검증을 통과한 후에만 git commit 할 것
- specs/features.json의 `passes` 필드 외 내용은 절대 수정하지 말 것
- description과 steps는 삭제·수정 금지 — 요구사항 진실 원천이므로
- 커밋 메시지는 `feat(F-XXX): 기능 설명 — 변경 내용 및 이유` 형식으로 작성

## 프레임워크 특수 규칙

<Step 1-c에서 파악한 프레임워크별 규칙을 항목으로 작성>
```

---

### Step 4 — IMPLEMENTATION_PLAN.md 생성 또는 갱신

`IMPLEMENTATION_PLAN.md`가 없으면 `specs/features.json`의 현재 상태를 읽어 아래 형식으로 생성합니다.
이미 있으면 현재 `passes` 상태와 비교하여 "완료된 기능" 수와 "다음 우선 작업" 항목을 최신화합니다.

생성할 내용 형식:

```markdown
# IMPLEMENTATION_PLAN.md

## 현재 상태 (마지막 업데이트: [오늘 날짜])

- 완료된 기능: [passes: true 항목 수]개 / 전체 [총 항목 수]개
- 마지막 커밋: [git log --oneline -1 결과]

## 다음 우선 작업

[passes: false인 항목 중 priority 기준 상위 5개를 나열]
- [ ] [id]: [description] (category: [category])

## 구현 순서 가이드

[레이어 의존성이 있는 프로젝트라면 의존성 기반 순서를 기술.
없으면 specs/features.json의 priority 순서대로 진행한다고 기재.]

## 알려진 이슈 / 기술 부채

- (없음 — 구현 시작 전)

## 세션 로그

### [오늘 날짜] — configure_loop 실행

- Ralph Loop 하네스 환경 초기 설정 완료
- 생성된 파일: AGENTS.md, IMPLEMENTATION_PLAN.md, PROMPT_plan.md, PROMPT_build.md, loop.sh
```

---

### Step 5 — PROMPT_plan.md 생성 (없을 경우에만)

`PROMPT_plan.md`는 Initializer Agent 전용 참조 프롬프트입니다.
`specs/features.json`이 이미 존재하는 상태에서 이 커맨드가 실행되므로, Initializer 단계는 완료된 상태입니다.
파일이 없으면 아래 내용으로 생성합니다 (향후 신규 프로젝트 참조용).

```markdown
# PROMPT_plan.md — Initializer Agent (참조용)

> 이 프롬프트는 specs/features.json이 없는 새 프로젝트의 최초 초기화 시 사용됩니다.
> 현재 프로젝트는 `/extract_features_json`으로 이미 features.json이 생성되어 있습니다.

## 지시사항

1. `pwd`를 실행하여 작업 디렉토리를 확인합니다.
2. 프로젝트 문서(CLAUDE.md, README 등)를 읽어 요구사항과 아키텍처를 파악합니다.
3. 프로젝트의 기술 스택을 조사합니다 (언어·런타임·빌드 도구 감지).
4. `/extract_features_json`을 실행하여 `specs/features.json`을 생성합니다.
5. `AGENTS.md`를 작성합니다 (기술 스택에 맞는 실제 검증 명령 및 운영 규칙).
6. `IMPLEMENTATION_PLAN.md` 초안을 작성합니다.
7. `git add -A && git commit -m "init: Ralph Loop 하네스 초기 설정 완료"`
```

---

### Step 6 — PROMPT_build.md 생성 또는 갱신

Coding Agent가 매 반복 시작 시 읽는 핵심 프롬프트입니다.
검증 명령은 AGENTS.md를 읽어 파악하도록 작성합니다 — 언어·프레임워크에 무관하게 동작합니다.
없으면 생성하고, 있으면 현재 프로젝트 상태와 맞는지 확인 후 필요한 부분만 수정합니다.

생성할 내용:

````markdown
# PROMPT_build.md — Coding Agent (Ralph Loop)

이 프롬프트는 loop.sh가 매 반복마다 Coding Agent에게 전달합니다.
반드시 아래 순서를 따르고, 단계를 건너뛰지 마십시오.

---

## 세션 시작 루틴 (매 반복 필수)

1. `pwd` — 작업 디렉토리가 프로젝트 루트인지 확인
2. `AGENTS.md` 읽기 — **검증 명령**과 **프레임워크 특수 규칙** 숙지
   (이 파일이 이 세션에서 실행할 모든 명령의 기준입니다)
3. `IMPLEMENTATION_PLAN.md` 읽기 — 이전 세션에서 무엇을 했는지, 다음 작업이 무엇인지 파악
4. `git log --oneline -10` — 최근 커밋 히스토리 확인
5. AGENTS.md에 명시된 **스모크 체크** 실행
   - 실패 시: 새 기능 구현 전에 반드시 수정 먼저

---

## 구현 사이클 (6단계)

### ① 스펙 확인
`specs/features.json`을 읽어 `passes: false`인 항목 중
IMPLEMENTATION_PLAN.md의 구현 순서 가이드를 참고하여 최우선 기능 하나를 선택합니다.

### ② 계획 갱신
`IMPLEMENTATION_PLAN.md`의 "다음 우선 작업" 항목이 현재 선택한 기능과 일치하는지 확인합니다.
불일치하면 파일을 업데이트합니다.

### ③ 단일 구현
선택한 기능 **하나만** 구현합니다. 범위를 벗어나지 마십시오.
AGENTS.md의 "프레임워크 특수 규칙"을 반드시 준수합니다.

### ④ 검증 (AGENTS.md의 "검증 명령" 순서대로)
AGENTS.md에 기재된 검증 게이트를 순서대로 실행합니다.
모두 exit code 0이어야 합니다.

### ⑤ 실패 시 수정
에러 메시지를 읽고 정확한 원인을 파악합니다.
수정 후 ④로 복귀합니다. 검증 우회(임시 주석, 타입 캐스팅 등)는 금지합니다.

### ⑥ 성공 시 커밋
```
1. specs/features.json에서 구현된 기능의 passes를 true로 변경
2. implemented_in_commit 필드에 커밋 해시 기록 (git rev-parse HEAD 참조)
3. git add -A
4. git commit -m "feat(F-XXX): [기능 설명]

- 변경: [어떤 파일에 무엇을 추가/수정했는지]
- 이유: [왜 이 방식으로 구현했는지]
- 검증: [AGENTS.md의 검증 게이트] 모두 통과"
5. IMPLEMENTATION_PLAN.md 갱신 (완료 기능 수, 세션 로그 추가)
```

---

## 절대 금지 사항

- 여러 기능을 한 번에 구현하는 것
- 검증 없이 커밋하는 것
- specs/features.json의 description, steps 수정 또는 삭제
- 검증 우회 수단 사용 (언어별: `// @ts-ignore`, `# type: ignore`, `#[allow(unused)]`, `//nolint` 등)
- 세션 종료 전 IMPLEMENTATION_PLAN.md 미갱신
````

---

### Step 7 — loop.sh 생성 (없을 경우에만)

`loop.sh`가 없으면 아래 내용으로 생성합니다.
있으면 내용을 읽어 현재 프로젝트와 맞는지 확인만 합니다.

```bash
#!/bin/bash
# loop.sh — Ralph Loop 기반 장기 실행 에이전트 하네스
# 참고: .claude/external_knowledges/ralph_longterm_combined.md
# 사용법: bash loop.sh [최대반복횟수]
# 예시:   bash loop.sh 50

MAX_ITERATIONS=${1:-999}
ITERATION=0

echo "=== Ralph Loop 시작 (최대 ${MAX_ITERATIONS}회) ==="

# 전제 조건 확인: specs/features.json이 존재해야 함
if [ ! -f "specs/features.json" ]; then
  echo "오류: specs/features.json이 없습니다."
  echo "먼저 /extract_features_json 커맨드를 실행하여 기능 목록을 생성하세요."
  exit 1
fi

# Coding Agent 반복 실행 (Ralph Loop)
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "=== Coding Agent 반복 #$ITERATION / 최대 $MAX_ITERATIONS ==="

  # 완료되지 않은 기능이 남아 있는지 확인 (jq 필요)
  if command -v jq &>/dev/null; then
    REMAINING=$(jq '[.[] | select(.passes == false)] | length' specs/features.json)
    if [ "$REMAINING" -eq 0 ]; then
      echo "모든 기능 구현 완료 (specs/features.json 기준). 루프를 종료합니다."
      break
    fi
    echo "남은 기능: ${REMAINING}개"
  fi

  # Coding Agent 실행
  claude --print --prompt-file PROMPT_build.md

  echo "반복 #$ITERATION 완료."
done

echo ""
echo "=== Ralph Loop 종료 (총 ${ITERATION}회 실행) ==="
```

생성 후 실행 권한을 부여합니다:
```bash
chmod +x loop.sh
```

---

### Step 8 — 결과 보고

모든 파일 생성·갱신이 완료되면 다음 항목을 보고합니다:

1. **감지된 기술 스택**: 언어, 런타임, 프레임워크, 확정된 검증 게이트 명령
2. **생성·갱신된 파일 목록**: 각 파일 경로와 역할
3. **현재 기능 현황**: `specs/features.json` 기준 완료/미완료 수
4. **다음 실행 방법**:
   - 단일 반복: `bash loop.sh 1`
   - 전체 자동: `bash loop.sh`
   - 수동 실행: `claude --print --prompt-file PROMPT_build.md`
5. **주의사항**: `loop.sh`는 `jq` CLI가 설치되어 있어야 남은 기능 수를 계산할 수 있음.

---

## 참고 — Ralph Loop 핵심 원칙

이 설정의 이론적 기반: `.claude/external_knowledges/ralph_longterm_combined.md`

| 원칙 | 적용 |
|------|------|
| 컨텍스트는 소모품이다 | 매 세션은 AGENTS.md, IMPLEMENTATION_PLAN.md, git log로 스스로 컨텍스트 재구성 |
| 계획은 부패한다 | IMPLEMENTATION_PLAN.md는 매 커밋마다 현행화, specs/features.json이 진실 원천 |
| 지시보다 압력이 강하다 | AGENTS.md의 검증 게이트 전부 통과해야만 커밋 허용 — 언어 무관하게 동일 원칙 적용 |
