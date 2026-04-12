# PROMPT_plan.md — Initializer Agent (참조용)

> 이 프롬프트는 `specs/features.json`이 없는 새 프로젝트의 최초 초기화 시 사용됩니다.
> 현재 프로젝트는 `/extract_features_json`으로 이미 `specs/features.json`이 생성되어 있습니다.
> 이 파일은 향후 신규 프로젝트에서 참조하기 위해 보관합니다.

---

## 지시사항

1. `pwd`를 실행하여 작업 디렉토리를 확인합니다.

2. 프로젝트 문서를 읽어 요구사항과 아키텍처를 파악합니다.
   - `CLAUDE.md` — 프로젝트 목적, 아키텍처, 주요 기능
   - `README.md` 또는 `README.ko.md` — 사용자 대상 기능 설명
   - `docs/PRD.md`, `docs/requirements.md` 등 요구사항 문서
   - `.claude/plans/PLAN.md` — 구현 계획

3. 프로젝트의 기술 스택을 조사합니다.
   - `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod` 등 의존성 파일 확인
   - 사용 언어, 런타임, 빌드 도구, 테스트 프레임워크 파악

4. `/extract_features_json`을 실행하여 `specs/features.json`을 생성합니다.
   - 모든 기능은 `passes: false`로 초기화
   - 기능은 end-to-end 사용자 시나리오 단위로 세분화
   - `id`, `category`, `priority`, `description`, `steps`, `passes`, `implemented_in_commit`, `notes` 필드 포함

5. `AGENTS.md`를 작성합니다.
   - 프로젝트 개요 (한 줄 설명, 언어, 런타임, 프레임워크)
   - 검증 명령 (타입 체크 → 린트 → 테스트 → 빌드 순서)
   - 세션 스모크 체크 명령
   - 운영 규칙
   - 프레임워크 특수 규칙

6. `IMPLEMENTATION_PLAN.md` 초안을 작성합니다.
   - 현재 상태 (완료 0 / 전체 N)
   - 다음 우선 작업 목록 (priority 순 상위 10개)
   - 구현 순서 가이드 (레이어 의존성 기준)

7. `PROMPT_build.md`를 생성합니다.

8. `loop.sh`를 생성하고 실행 권한을 부여합니다.

9. 초기 커밋을 생성합니다.
   ```bash
   git add -A
   git commit -m "init: Ralph Loop 하네스 초기 설정 완료

   - AGENTS.md, IMPLEMENTATION_PLAN.md, PROMPT_plan.md, PROMPT_build.md, loop.sh 생성
   - specs/features.json N개 기능 항목 추출 완료"
   ```
