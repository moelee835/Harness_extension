// VSCode 확장 기능 API 가져오기
import * as vscode from 'vscode';

/**
 * Extension 활성화 진입점.
 * VSCode가 워크스페이스를 열고 onStartupFinished 이벤트가 발생할 때 호출된다.
 * 모든 명령(Command)과 뷰(View) 등록은 이 함수 내에서 수행하며,
 * 등록한 disposable은 반드시 context.subscriptions에 추가하여 메모리 누수를 방지한다.
 *
 * @param context - VSCode가 제공하는 Extension 컨텍스트 객체
 */
export function activate(context: vscode.ExtensionContext): void {
	// 활성화 성공 로그 출력 (Output 패널에서 확인 가능)
	console.log('[AgentHarness] Extension이 활성화되었습니다.');

	// helloWorld 명령 등록 — package.json의 contributes.commands ID와 반드시 일치해야 함
	const helloWorldDisposable = vscode.commands.registerCommand(
		'agent-harness-framework.helloWorld',
		() => {
			// 사용자에게 안내 메시지 표시
			vscode.window.showInformationMessage('Hello World from Agent Harness Framework!');
		}
	);

	// 등록한 모든 disposable을 subscriptions에 추가하여 Extension 비활성화 시 자동 해제
	context.subscriptions.push(helloWorldDisposable);
}

/**
 * Extension 비활성화 진입점.
 * context.subscriptions에 등록된 모든 disposable은 VSCode가 자동으로 dispose() 호출한다.
 * 추가적인 정리 작업이 필요한 경우 여기에 구현한다.
 */
export function deactivate(): void {
	// context.subscriptions 항목은 VSCode가 자동 해제하므로 별도 처리 불필요
	console.log('[AgentHarness] Extension이 비활성화되었습니다.');
}
