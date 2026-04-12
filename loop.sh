#!/bin/bash
# loop.sh — Ralph Loop 기반 장기 실행 에이전트 하네스
# 참고: .claude/external_knowledges/ralph_longterm_combined.md
#
# 사용법: bash loop.sh [최대반복횟수]
# 예시:   bash loop.sh 50
#         bash loop.sh       (기본값: 999회)
#
# 전제 조건:
#   - specs/features.json 이 존재해야 함 (/extract_features_json 먼저 실행)
#   - AGENTS.md, IMPLEMENTATION_PLAN.md, PROMPT_build.md 이 존재해야 함 (/configure_loop 먼저 실행)
#   - claude CLI 가 PATH 에 존재해야 함
#   - jq 가 설치되어 있으면 남은 기능 수를 계산할 수 있음 (선택사항)

set -euo pipefail

MAX_ITERATIONS=${1:-999}
ITERATION=0

echo "=== Ralph Loop 시작 (최대 ${MAX_ITERATIONS}회) ==="
echo "프로젝트: $(pwd)"
echo "시작 시각: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 전제 조건 확인: specs/features.json 이 존재해야 함
if [ ! -f "specs/features.json" ]; then
  echo "오류: specs/features.json 이 없습니다."
  echo "먼저 /extract_features_json 커맨드를 실행하여 기능 목록을 생성하세요."
  exit 1
fi

# 전제 조건 확인: PROMPT_build.md 가 존재해야 함
if [ ! -f "PROMPT_build.md" ]; then
  echo "오류: PROMPT_build.md 가 없습니다."
  echo "먼저 /configure_loop 커맨드를 실행하여 루프 환경을 설정하세요."
  exit 1
fi

# Coding Agent 반복 실행 (Ralph Loop)
while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "=== Coding Agent 반복 #${ITERATION} / 최대 ${MAX_ITERATIONS} ==="
  echo "시각: $(date '+%H:%M:%S')"

  # 완료되지 않은 기능이 남아 있는지 확인 (jq 설치된 경우)
  if command -v jq &>/dev/null; then
    REMAINING=$(jq '[.[] | select(.passes == false)] | length' specs/features.json)
    TOTAL=$(jq 'length' specs/features.json)
    DONE=$((TOTAL - REMAINING))
    echo "진행 현황: ${DONE}/${TOTAL} 완료, ${REMAINING}개 남음"
    if [ "$REMAINING" -eq 0 ]; then
      echo ""
      echo "모든 기능 구현 완료 (specs/features.json 기준). 루프를 종료합니다."
      break
    fi
  else
    echo "팁: jq 를 설치하면 남은 기능 수를 자동으로 계산합니다 (brew install jq / apt install jq)"
  fi

  # Coding Agent 실행
  cat PROMPT_build.md | claude --dangerously-skip-permissions --print

  EXIT_CODE=$?
  if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "경고: Coding Agent가 exit code ${EXIT_CODE}로 종료되었습니다."
    echo "루프를 중단합니다. 에러를 확인하고 다시 실행하세요."
    exit $EXIT_CODE
  fi

  echo "반복 #${ITERATION} 완료."
done

echo ""
echo "=== Ralph Loop 종료 ==="
echo "총 실행 횟수: ${ITERATION}회"
echo "종료 시각: $(date '+%Y-%m-%d %H:%M:%S')"
