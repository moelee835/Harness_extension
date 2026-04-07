# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

Read `.claude/MEMORY.md` at the start of every session and treat its contents as your working memory. Update MEMORY.md at the end of each session to reflect what was accomplished, decisions made, and what comes next. Keep MEMORY.md under 200 lines at all times — summarize older entries when it approaches the limit.

## Project

<!-- 이 프로젝트가 무엇을 하는지 한두 문장으로 설명하세요 -->

## Tech Stack

<!-- 사용 중인 언어, 프레임워크, 주요 라이브러리를 나열하세요 -->
<!-- 예: Python 3.11, FastAPI, PostgreSQL, Redis -->

## Architecture

<!-- 주요 모듈, 레이어, 데이터 흐름을 러프하게 설명하세요 -->
<!-- 예: src/api → src/service → src/repository → DB -->

## Team Conventions

<!-- 브랜치 전략, 커밋 메시지 규칙, 코드 스타일 등을 적으세요 -->
<!-- 예: feat/이슈번호-설명, Conventional Commits, Black formatter -->

## Key Rules

<!-- 반드시 지켜야 할 규칙을 적으세요 -->

## Slash Commands

- `/init-claude-project` — 새 프로젝트 Claude Code 환경 초기화
- `/enhance-claude-md` — CLAUDE.md 내용을 코드베이스 기반으로 구체화

## Files

- `CLAUDE.md` — project-wide guidance (this file, committed)
- `CLAUDE.local.md` — personal overrides (gitignored)
- `.mcp.json` — MCP server config (committed)
- `.claude/MEMORY.md` — Claude Code working memory (committed)
- `.claude/settings.json` — hooks, permissions, env (committed)
- `.claude/settings.local.json` — personal permission overrides (gitignored)
