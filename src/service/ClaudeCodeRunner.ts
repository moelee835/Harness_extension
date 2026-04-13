// Node.js 기본 모듈 — child_process.spawn으로 CLI 에이전트 프로세스 실행
import { spawn } from 'child_process';
import type { IAgentRunner } from './IAgentRunner.js';

/**
 * Claude Code CLI(`claude`)를 실행하는 에이전트 실행기.
 * IAgentRunner를 구현하며, AgentRunnerFactory가 agentType='claude' 설정 시 이 클래스를 반환한다.
 *
 * cliPath가 설정된 경우 해당 경로의 실행 파일을 사용하고,
 * 설정되지 않은 경우(빈 문자열) PATH 환경변수에서 'claude' 명령을 자동 탐색한다.
 *
 * F-017: AgentRunnerFactory.create()가 claude 타입에 이 클래스 인스턴스를 반환한다.
 */
export class ClaudeCodeRunner implements IAgentRunner {
	/**
	 * child_process.spawn에 실제로 전달될 명령 문자열.
	 * cliPath가 빈 문자열이면 'claude'(PATH 탐색), 그렇지 않으면 cliPath 그대로 사용.
	 */
	private readonly _spawnCommand: string;

	/**
	 * spawn 호출 시 프롬프트 앞에 추가로 전달할 CLI 플래그 배열.
	 * AgentConfig.getExtraArgs()에서 공백 기준으로 split된 값이 전달된다.
	 */
	private readonly _extraArgs: string[];

	/**
	 * ClaudeCodeRunner 생성자.
	 *
	 * @param cliPath - Claude Code CLI 실행 파일의 절대 경로.
	 *                  빈 문자열이면 PATH에서 'claude'를 자동 탐색한다.
	 * @param extraArgs - spawn 호출 시 추가로 전달할 CLI 플래그 배열 (예: ['--verbose'])
	 */
	constructor(cliPath: string, extraArgs: string[]) {
		// cliPath가 공백만 있거나 빈 문자열이면 기본 명령('claude')을 사용
		this._spawnCommand = cliPath.trim() !== '' ? cliPath : 'claude';
		this._extraArgs = extraArgs;
	}

	/**
	 * child_process.spawn에 전달될 명령 문자열을 반환한다.
	 * 테스트에서 실제 스폰 없이 설정된 명령을 검증할 때 사용한다.
	 *
	 * @returns spawn 명령 문자열 (예: 'claude' 또는 '/usr/local/bin/claude')
	 */
	public getSpawnCommand(): string {
		return this._spawnCommand;
	}

	/**
	 * Claude Code CLI를 child_process.spawn으로 실행하여 주어진 프롬프트를 처리한다.
	 * stdout/stderr 스트리밍은 F-020에서 구현 예정이다.
	 *
	 * @param prompt - Claude Code에 전달할 프롬프트 문자열
	 * @returns 프로세스가 종료될 때 resolve되는 Promise.
	 *          비정상 종료 코드(0이 아닌 경우) 시 Error를 throw한다.
	 */
	public invoke(prompt: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// '--print' 플래그로 비대화형(non-interactive) 모드 실행
			// 추가 플래그 배열이 있으면 앞에 붙여 전달
			const args = [...this._extraArgs, '--print', prompt];

			// child_process.spawn으로 Claude Code CLI 프로세스 생성
			const child = spawn(this._spawnCommand, args, {
				// 부모 프로세스의 환경변수를 그대로 상속 (PATH 포함)
				env: process.env,
				// 셸을 거치지 않고 직접 실행하여 인젝션 위험 방지
				shell: false,
			});

			// 프로세스 종료 이벤트 처리
			child.on('close', (code: number | null) => {
				if (code === 0 || code === null) {
					resolve();
				} else {
					// 비정상 종료 시 종료 코드를 포함한 오류를 상위로 전달
					reject(new Error(`Claude Code CLI 프로세스가 종료 코드 ${code}로 종료되었습니다.`));
				}
			});

			// 프로세스 시작 오류 처리 (실행 파일을 찾을 수 없는 경우 등)
			child.on('error', (err: Error) => {
				reject(new Error(`Claude Code CLI 프로세스 시작 실패: ${err.message}`));
			});
		});
	}
}
