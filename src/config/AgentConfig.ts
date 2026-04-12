// VSCode Extension API 가져오기
import * as vscode from 'vscode';

/**
 * 지원하는 CLI 에이전트 종류.
 * - 'claude': Claude Code CLI (기본값)
 * - 'gemini': Gemini CLI
 * - 'custom': 사용자가 직접 지정한 CLI 명령
 */
export type AgentType = 'claude' | 'gemini' | 'custom';

/** 지원되는 에이전트 타입 값 목록 — 유효성 검사에 사용 */
const VALID_AGENT_TYPES: AgentType[] = ['claude', 'gemini', 'custom'];

/**
 * CLI 에이전트 설정을 VSCode workspace configuration을 통해 읽고 쓰는 유틸리티 클래스.
 * F-014: 에이전트 타입 선택 및 저장
 * F-015: CLI 실행 경로 설정 (향후 구현)
 * F-016: 추가 CLI 플래그 설정 (향후 구현)
 * F-027: VSCode 세션 간 설정 영속성 — workspace.getConfiguration이 자동으로 보장
 *
 * 설정 키 네임스페이스: 'agentHarness'
 */
export class AgentConfig {
	/** 설정 네임스페이스 식별자 */
	private static readonly NAMESPACE = 'agentHarness';

	/** agentType 설정 키 */
	private static readonly KEY_AGENT_TYPE = 'agentType';

	/** 기본 에이전트 타입 */
	public static readonly DEFAULT_AGENT_TYPE: AgentType = 'claude';

	/**
	 * 현재 설정된 에이전트 타입을 반환한다.
	 * 설정값이 없거나 유효하지 않으면 기본값('claude')을 반환한다.
	 *
	 * @returns 현재 에이전트 타입
	 */
	public static getAgentType(): AgentType {
		const config = vscode.workspace.getConfiguration(AgentConfig.NAMESPACE);
		const value = config.get<string>(AgentConfig.KEY_AGENT_TYPE);

		// 유효성 검사: 알려진 타입이 아니면 기본값 반환
		if (value && (VALID_AGENT_TYPES as string[]).includes(value)) {
			return value as AgentType;
		}

		return AgentConfig.DEFAULT_AGENT_TYPE;
	}

	/**
	 * 에이전트 타입을 VSCode 전역 설정에 저장한다.
	 * 저장된 값은 VSCode 세션 간 영속적으로 유지된다.
	 *
	 * @param type - 저장할 에이전트 타입 ('claude' | 'gemini' | 'custom')
	 * @returns 설정 저장 완료를 나타내는 Promise
	 */
	public static async setAgentType(type: AgentType): Promise<void> {
		const config = vscode.workspace.getConfiguration(AgentConfig.NAMESPACE);
		// ConfigurationTarget.Global: 전역 설정 파일(settings.json)에 저장 → 세션 간 영속성 보장
		await config.update(AgentConfig.KEY_AGENT_TYPE, type, vscode.ConfigurationTarget.Global);
	}
}
