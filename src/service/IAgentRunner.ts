/**
 * CLI 에이전트 실행기의 공통 인터페이스.
 * 에이전트 종류(Claude Code, Gemini CLI, 사용자 지정 CLI)에 상관없이
 * 동일한 방식으로 에이전트를 호출할 수 있도록 추상화한다.
 *
 * F-017, F-018, F-019: AgentRunnerFactory가 이 인터페이스를 통해
 * 각 에이전트 구현체를 반환한다.
 * F-034: cancel()/isRunning()으로 실행 중인 프로세스 제어 지원.
 */
export interface IAgentRunner {
	/**
	 * CLI 에이전트를 호출하여 주어진 프롬프트를 처리한다.
	 * 에이전트 프로세스가 종료될 때까지 대기한다.
	 *
	 * F-020: onStdout/onStderr 콜백을 통해 프로세스 출력을 실시간으로 전달받을 수 있다.
	 * 콜백을 생략하면 출력을 무시한다.
	 *
	 * @param prompt - 에이전트에게 전달할 프롬프트 문자열
	 * @param onStdout - stdout 데이터 수신 시 호출되는 콜백 (선택)
	 * @param onStderr - stderr 데이터 수신 시 호출되는 콜백 (선택)
	 * @returns 프로세스 종료 후 resolve되는 Promise
	 */
	invoke(
		prompt: string,
		onStdout?: (chunk: string) => void,
		onStderr?: (chunk: string) => void,
	): Promise<void>;

	/**
	 * 현재 실행 중인 에이전트 프로세스를 즉시 종료한다.
	 * 실행 중인 프로세스가 없으면 아무 동작도 하지 않는다.
	 * F-034: UI의 '취소' 버튼 클릭 시 Extension이 이 메서드를 호출한다.
	 */
	cancel(): void;

	/**
	 * 현재 에이전트 프로세스가 실행 중인지 여부를 반환한다.
	 * F-034: UI에서 취소 버튼 표시 여부 결정 및 테스트 검증에 사용된다.
	 *
	 * @returns 프로세스가 실행 중이면 true, 그렇지 않으면 false
	 */
	isRunning(): boolean;

	/**
	 * 에이전트 실행 시 사용될 CLI 명령(실행 파일 경로 또는 이름)을 반환한다.
	 * 테스트 환경에서 child_process.spawn에 전달될 명령을 검증할 때 사용한다.
	 *
	 * @returns spawn 호출에 사용되는 명령 문자열 (예: 'claude', '/usr/local/bin/gemini')
	 */
	getSpawnCommand(): string;
}
