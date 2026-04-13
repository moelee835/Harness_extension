// 에이전트 설정 읽기 클래스 가져오기
import { AgentConfig } from '../config/AgentConfig.js';
// IAgentRunner 인터페이스 가져오기
import type { IAgentRunner } from './IAgentRunner.js';
// Claude Code CLI 실행기 가져오기
import { ClaudeCodeRunner } from './ClaudeCodeRunner.js';
// Gemini CLI 실행기 가져오기
import { GeminiCliRunner } from './GeminiCliRunner.js';

/**
 * AgentConfig 설정에 따라 적절한 IAgentRunner 구현체를 생성하여 반환하는 팩토리 클래스.
 *
 * 지원하는 에이전트 타입:
 * - 'claude': ClaudeCodeRunner 반환 (F-017)
 * - 'gemini': GeminiCliRunner 반환 (F-018)
 * - 'custom': CustomCliRunner 반환 (F-019 — 미구현)
 *
 * OCP(Open-Closed Principle) 준수:
 * 새 에이전트 타입 추가 시 switch 케이스만 확장하면 되므로 기존 코드 수정 불필요.
 */
export class AgentRunnerFactory {
	/**
	 * 현재 AgentConfig 설정을 읽어 적절한 IAgentRunner 구현체를 생성·반환한다.
	 *
	 * cliPath가 빈 문자열이면 각 Runner가 기본 명령(예: 'claude', 'gemini')을 사용한다.
	 * extraArgs는 공백 기준으로 split하여 배열로 변환한 후 Runner에 전달한다.
	 *
	 * @returns 현재 설정에 맞는 IAgentRunner 구현체
	 * @throws Error - 지원하지 않는 agentType인 경우 (F-018, F-019 구현 전 'gemini'/'custom' 요청 시)
	 */
	public static create(): IAgentRunner {
		// 현재 설정에서 에이전트 타입, CLI 경로, 추가 플래그 읽기
		const agentType = AgentConfig.getAgentType();
		const cliPath = AgentConfig.getCliPath();

		// extraArgs: 빈 문자열이면 빈 배열, 그렇지 않으면 공백 기준으로 split
		const extraArgsStr = AgentConfig.getExtraArgs();
		const extraArgs = extraArgsStr.trim() !== '' ? extraArgsStr.trim().split(/\s+/) : [];

		// agentType에 따라 적절한 Runner 인스턴스를 생성하여 반환
		switch (agentType) {
			case 'claude':
				// F-017: Claude Code CLI 실행기 반환
				return new ClaudeCodeRunner(cliPath, extraArgs);

			case 'gemini':
				// F-018: Gemini CLI 실행기 반환
				return new GeminiCliRunner(cliPath, extraArgs);

			case 'custom':
				// TODO: F-019 — CustomCliRunner 구현 후 교체
				throw new Error('CustomCliRunner는 F-019에서 구현 예정입니다.');

			default: {
				// agentType이 추가되었지만 factory에 케이스가 없는 경우 방어
				const exhaustiveCheck: never = agentType;
				throw new Error(`지원하지 않는 에이전트 타입: ${exhaustiveCheck}`);
			}
		}
	}
}
