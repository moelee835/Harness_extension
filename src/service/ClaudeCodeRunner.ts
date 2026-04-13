// Node.js 기본 모듈 — child_process.spawn으로 CLI 에이전트 프로세스 실행
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
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
	 * 현재 실행 중인 child_process 인스턴스.
	 * invoke() 호출 시 설정되고, 프로세스 종료 또는 cancel() 호출 시 null로 초기화된다.
	 * F-034: cancel() 호출 시 이 참조를 통해 프로세스를 종료한다.
	 */
	private _childProcess: ChildProcess | null = null;

	/**
	 * 현재 에이전트 프로세스 실행 여부.
	 * invoke() 호출 시 true, 프로세스 종료 시 false로 변경된다.
	 * F-034: isRunning()을 통해 외부에서 조회 가능하다.
	 */
	private _isRunning: boolean = false;

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
	 * 현재 에이전트 프로세스가 실행 중인지 여부를 반환한다.
	 * F-034: UI에서 취소 버튼 표시 여부 결정 및 테스트 검증에 사용된다.
	 *
	 * @returns 프로세스가 실행 중이면 true, 그렇지 않으면 false
	 */
	public isRunning(): boolean {
		return this._isRunning;
	}

	/**
	 * 현재 실행 중인 Claude Code CLI 프로세스를 즉시 종료한다.
	 * 실행 중인 프로세스가 없으면 아무 동작도 하지 않는다.
	 * F-034: UI의 '취소' 버튼 클릭 시 Extension이 이 메서드를 호출한다.
	 */
	public cancel(): void {
		if (this._childProcess !== null) {
			// SIGTERM 신호를 보내 프로세스를 종료한다.
			// 프로세스 종료 후 close 이벤트에서 _isRunning과 _childProcess가 초기화된다.
			this._childProcess.kill();
		}
	}

	/**
	 * Claude Code CLI를 child_process.spawn으로 실행하여 주어진 프롬프트를 처리한다.
	 * F-020: stdout/stderr 데이터를 실시간으로 콜백에 전달한다.
	 *
	 * @param prompt - Claude Code에 전달할 프롬프트 문자열
	 * @param onStdout - stdout 데이터 청크 수신 시 호출되는 콜백 (선택)
	 * @param onStderr - stderr 데이터 청크 수신 시 호출되는 콜백 (선택)
	 * @returns 프로세스가 종료될 때 resolve되는 Promise.
	 *          비정상 종료 코드(0이 아닌 경우) 시 Error를 throw한다.
	 */
	public invoke(
		prompt: string,
		onStdout?: (chunk: string) => void,
		onStderr?: (chunk: string) => void,
	): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// '--print' 플래그로 비대화형(non-interactive) 모드 실행
			// 추가 플래그 배열이 있으면 앞에 붙여 전달
			const args = [...this._extraArgs, '--print', prompt];

			// child_process.spawn으로 Claude Code CLI 프로세스 생성
			// stdio 기본값 'pipe' — stdout/stderr을 스트림으로 수신 가능 (F-020)
			const child = spawn(this._spawnCommand, args, {
				// 부모 프로세스의 환경변수를 그대로 상속 (PATH 포함)
				env: process.env,
				// 셸을 거치지 않고 직접 실행하여 인젝션 위험 방지
				shell: false,
			});

			// 실행 상태 플래그 설정 및 프로세스 참조 저장
			this._isRunning = true;
			this._childProcess = child;

			// F-020: stdout 데이터를 청크 단위로 수신하여 콜백 호출
			if (onStdout) {
				child.stdout?.on('data', (data: Buffer) => {
					onStdout(data.toString());
				});
			}

			// F-020: stderr 데이터를 청크 단위로 수신하여 콜백 호출
			if (onStderr) {
				child.stderr?.on('data', (data: Buffer) => {
					onStderr(data.toString());
				});
			}

			// 프로세스 종료 이벤트 처리 (정상 종료, 오류 종료, 취소 종료 모두 포함)
			child.on('close', (code: number | null) => {
				// 종료 원인과 무관하게 실행 상태 해제
				this._isRunning = false;
				this._childProcess = null;

				if (code === 0 || code === null) {
					// 정상 종료 또는 SIGTERM(null) 종료 시 resolve
					resolve();
				} else {
					// 비정상 종료 시 종료 코드를 포함한 오류를 상위로 전달
					reject(new Error(`Claude Code CLI 프로세스가 종료 코드 ${code}로 종료되었습니다.`));
				}
			});

			// 프로세스 시작 오류 처리 (실행 파일을 찾을 수 없는 경우 등)
			child.on('error', (err: Error) => {
				// 프로세스 시작 실패 시에도 실행 상태 해제
				this._isRunning = false;
				this._childProcess = null;
				reject(new Error(`Claude Code CLI 프로세스 시작 실패: ${err.message}`));
			});
		});
	}
}
