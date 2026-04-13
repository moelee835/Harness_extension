// Node.js 기본 모듈 — child_process.spawn으로 CLI 에이전트 프로세스 실행
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
import type { IAgentRunner } from './IAgentRunner.js';

/**
 * 사용자 지정 CLI 명령을 실행하는 에이전트 실행기.
 * IAgentRunner를 구현하며, AgentRunnerFactory가 agentType='custom' 설정 시 이 클래스를 반환한다.
 *
 * 사용자가 Extension 설정(agentHarness.cliPath)에 직접 지정한 실행 파일 경로를 그대로 사용한다.
 * cliPath가 빈 문자열이면 실행 시 오류가 발생할 수 있으므로, 사용자가 반드시 유효한 경로를 설정해야 한다.
 *
 * F-019: AgentRunnerFactory.create()가 custom 타입에 이 클래스 인스턴스를 반환한다.
 */
export class CustomCliRunner implements IAgentRunner {
	/**
	 * child_process.spawn에 실제로 전달될 명령 문자열.
	 * agentHarness.cliPath 설정값을 그대로 사용한다.
	 * 빈 문자열이면 spawn 실행 시 오류가 발생하므로 사용자가 유효한 경로를 입력해야 한다.
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
	 * CustomCliRunner 생성자.
	 *
	 * @param cliPath - 사용자 지정 CLI 실행 파일의 절대 경로.
	 *                  빈 문자열이면 실행 시 오류가 발생하므로 유효한 경로를 입력해야 한다.
	 * @param extraArgs - spawn 호출 시 추가로 전달할 CLI 플래그 배열 (예: ['--verbose', '--no-cache'])
	 */
	constructor(cliPath: string, extraArgs: string[]) {
		// 사용자가 설정한 경로를 그대로 사용 — 기본값 없음
		this._spawnCommand = cliPath;
		this._extraArgs = extraArgs;
	}

	/**
	 * child_process.spawn에 전달될 명령 문자열을 반환한다.
	 * 테스트에서 실제 스폰 없이 설정된 명령을 검증할 때 사용한다.
	 *
	 * @returns spawn 명령 문자열 (사용자가 agentHarness.cliPath에 설정한 값)
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
	 * 현재 실행 중인 사용자 지정 CLI 프로세스를 즉시 종료한다.
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
	 * 사용자 지정 CLI를 child_process.spawn으로 실행하여 주어진 프롬프트를 처리한다.
	 * stdout/stderr 스트리밍은 F-020에서 구현 예정이다.
	 *
	 * @param prompt - 사용자 지정 CLI에 전달할 프롬프트 문자열
	 * @returns 프로세스가 종료될 때 resolve되는 Promise.
	 *          비정상 종료 코드(0이 아닌 경우) 시 Error를 throw한다.
	 */
	public invoke(prompt: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			// 추가 플래그 배열이 있으면 앞에 붙여 전달
			const args = [...this._extraArgs, prompt];

			// child_process.spawn으로 사용자 지정 CLI 프로세스 생성
			const child = spawn(this._spawnCommand, args, {
				// 부모 프로세스의 환경변수를 그대로 상속 (PATH 포함)
				env: process.env,
				// 셸을 거치지 않고 직접 실행하여 인젝션 위험 방지
				shell: false,
			});

			// 실행 상태 플래그 설정 및 프로세스 참조 저장
			this._isRunning = true;
			this._childProcess = child;

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
					reject(new Error(`사용자 지정 CLI 프로세스가 종료 코드 ${code}로 종료되었습니다.`));
				}
			});

			// 프로세스 시작 오류 처리 (실행 파일을 찾을 수 없는 경우 등)
			child.on('error', (err: Error) => {
				// 프로세스 시작 실패 시에도 실행 상태 해제
				this._isRunning = false;
				this._childProcess = null;
				reject(new Error(`사용자 지정 CLI 프로세스 시작 실패: ${err.message}`));
			});
		});
	}
}
