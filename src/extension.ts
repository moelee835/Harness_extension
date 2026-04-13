// VSCode 확장 기능 API 가져오기
import * as vscode from 'vscode';
// 메인 패널 UI 클래스 가져오기
import { MainPanel } from './ui/MainPanel.js';
// 에이전트 설정 패널 UI 클래스 가져오기
import { AgentSettingsView } from './ui/AgentSettingsView.js';
// 에이전트 실행기 팩토리 클래스 가져오기
import { AgentRunnerFactory } from './service/AgentRunnerFactory.js';
// Claude Code 실행기 클래스 가져오기 — 테스트에서 instanceof 검증에 사용
import { ClaudeCodeRunner } from './service/ClaudeCodeRunner.js';

/** Extension activate() 반환 타입 — 테스트에서 내부 상태 접근 시 사용 */
export interface ExtensionApi {
	/** 테스트에서 MainPanel 싱글톤 상태를 검증하기 위해 노출하는 클래스 참조 */
	MainPanel: typeof MainPanel;
	/** 테스트에서 AgentSettingsView 싱글톤 상태를 검증하기 위해 노출하는 클래스 참조 */
	AgentSettingsView: typeof AgentSettingsView;
	/** 테스트에서 AgentRunnerFactory.create() 호출 및 반환 타입을 검증하기 위해 노출 */
	AgentRunnerFactory: typeof AgentRunnerFactory;
	/** 테스트에서 instanceof ClaudeCodeRunner 검증에 사용 */
	ClaudeCodeRunner: typeof ClaudeCodeRunner;
}

/**
 * Extension 활성화 진입점.
 * VSCode가 워크스페이스를 열고 onStartupFinished 이벤트가 발생할 때 호출된다.
 * 모든 명령(Command)과 뷰(View) 등록은 이 함수 내에서 수행하며,
 * 등록한 disposable은 반드시 context.subscriptions에 추가하여 메모리 누수를 방지한다.
 *
 * @param context - VSCode가 제공하는 Extension 컨텍스트 객체
 * @returns ExtensionApi — 테스트에서 내부 모듈에 접근하기 위한 공개 인터페이스
 */
export function activate(context: vscode.ExtensionContext): ExtensionApi {
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

	// openMainPanel 명령 등록 — F-004: 메인 패널 열기
	// package.json의 contributes.commands에 선언된 ID와 반드시 일치해야 함
	const openMainPanelDisposable = vscode.commands.registerCommand(
		'agent-harness-framework.openMainPanel',
		() => {
			// MainPanel.show()를 호출하여 패널을 열거나 기존 패널에 포커스 이동
			MainPanel.show(context.extensionUri);
		}
	);

	// openAgentSettings 명령 등록 — F-014: 에이전트 설정 패널 열기
	// package.json의 contributes.commands에 선언된 ID와 반드시 일치해야 함
	const openAgentSettingsDisposable = vscode.commands.registerCommand(
		'agent-harness-framework.openAgentSettings',
		() => {
			// AgentSettingsView.show()를 호출하여 설정 패널을 열거나 기존 패널에 포커스 이동
			AgentSettingsView.show(context.extensionUri);
		}
	);

	// 등록한 모든 disposable을 subscriptions에 추가하여 Extension 비활성화 시 자동 해제
	context.subscriptions.push(helloWorldDisposable, openMainPanelDisposable, openAgentSettingsDisposable);

	// ExtensionApi 반환 — 테스트 환경에서 ext.exports.XXX 형태로 접근 가능
	return { MainPanel, AgentSettingsView, AgentRunnerFactory, ClaudeCodeRunner };
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
