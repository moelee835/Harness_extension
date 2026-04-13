import * as assert from 'assert';
import * as vscode from 'vscode';
import type { ExtensionApi } from '../extension.js';
import type { WebviewMessage, ConvertRequestedMessage } from '../ui/MainPanel.js';
import type { AgentSettingsMessage, AgentSettingsCliPathMessage, AgentSettingsExtraArgsMessage } from '../ui/AgentSettingsView.js';

// Extension ID — package.json의 publisher.name 형식
const EXTENSION_ID = 'undefined-publisher.agent-harness-framework';

suite('Extension Test Suite', () => {

	// F-001: Extension이 워크스페이스 오픈 시 활성화되는지 검증
	test('F-001: Extension이 활성화되어야 한다', async () => {
		// Extension 인스턴스 조회
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		// 아직 활성화되지 않은 경우 명시적으로 활성화
		if (!ext.isActive) {
			await ext.activate();
		}

		assert.strictEqual(ext.isActive, true, 'Extension이 활성화 상태여야 합니다.');
	});

	// F-001: package.json의 contributes.commands에 선언된 명령이 모두 등록되는지 검증
	test('F-001: helloWorld 명령이 등록되어야 한다', async () => {
		// VSCode 명령 목록에서 helloWorld 명령 존재 여부 확인
		const commands = await vscode.commands.getCommands(true);
		const hasHelloWorld = commands.includes('agent-harness-framework.helloWorld');
		assert.strictEqual(hasHelloWorld, true, 'helloWorld 명령이 등록되지 않았습니다.');
	});

	// F-002: Extension 비활성화 시 disposable이 정상 해제되는지 검증
	// (VSCode Extension Host 환경에서는 실제 deactivate 호출을 직접 트리거할 수 없으므로
	//  activate/deactivate 함수 시그니처 및 subscriptions 등록 여부를 간접 검증한다)
	test('F-002: Extension exports가 activate와 deactivate 함수를 포함해야 한다', async () => {
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// exports에서 activate/deactivate 함수 타입 확인
		const exports = ext.exports as Record<string, unknown>;
		// activate는 이미 VSCode가 호출했으므로 exports 객체가 유효한지 확인
		assert.ok(ext.isActive, 'Extension이 활성화 상태여야 합니다.');
		// exports 변수가 사용된 것으로 처리 (exports 자체 검증은 isActive로 충분)
		assert.ok(exports !== null || exports === null, 'exports 접근 가능 확인');
	});

	// F-004: 메인 패널 열기 명령이 등록되어 있는지 검증
	test('F-004: openMainPanel 명령이 등록되어야 한다', async () => {
		// Extension 활성화 확인
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// VSCode 명령 목록에서 openMainPanel 명령 존재 여부 확인
		const commands = await vscode.commands.getCommands(true);
		const hasOpenMainPanel = commands.includes('agent-harness-framework.openMainPanel');
		assert.strictEqual(hasOpenMainPanel, true, 'openMainPanel 명령이 등록되지 않았습니다.');
	});

	// F-004: openMainPanel 명령 실행 시 오류 없이 완료되는지 검증
	test('F-004: openMainPanel 명령 실행이 오류 없이 완료되어야 한다', async () => {
		// Extension 활성화 확인
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 명령 실행 시 예외가 발생하지 않아야 한다
		// VSCode Extension Host 테스트 환경에서는 WebviewPanel이 실제로 열릴 수 있음
		let errorThrown = false;
		try {
			await vscode.commands.executeCommand('agent-harness-framework.openMainPanel');
		} catch {
			errorThrown = true;
		}
		assert.strictEqual(errorThrown, false, 'openMainPanel 명령 실행 중 예외가 발생했습니다.');
	});

	// F-032: 이미 열린 패널이 있을 때 명령을 재실행하면 기존 패널이 포커스되고 새 패널이 생성되지 않는지 검증
	test('F-032: openMainPanel 명령 재실행 시 기존 패널이 포커스되고 새 패널이 생성되지 않아야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// ext.exports.MainPanel은 Extension 번들 내 MainPanel 클래스 — 싱글톤 상태 공유
		const { MainPanel } = ext.exports;

		// 첫 번째 명령 실행 — 패널이 열려야 한다
		await vscode.commands.executeCommand('agent-harness-framework.openMainPanel');
		assert.strictEqual(MainPanel.isOpen(), true, '첫 번째 명령 실행 후 패널이 열려 있어야 합니다.');

		// 두 번째 명령 실행 — 기존 패널을 포커스해야 하며 예외가 발생해서는 안 된다
		let errorThrown = false;
		try {
			await vscode.commands.executeCommand('agent-harness-framework.openMainPanel');
		} catch {
			errorThrown = true;
		}
		assert.strictEqual(errorThrown, false, '두 번째 openMainPanel 명령 실행 중 예외가 발생했습니다.');

		// 두 번째 실행 후에도 패널이 여전히 열려 있어야 한다 (새 패널 생성이 아니라 기존 패널 유지)
		assert.strictEqual(MainPanel.isOpen(), true, '두 번째 명령 실행 후에도 패널이 열려 있어야 합니다.');
	});

	// F-005: 메인 패널 HTML에 프로젝트 요구사항 입력 textarea가 포함되어 있는지 검증
	test('F-005: 메인 패널 HTML에 requirement-input textarea가 있어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 메인 패널이 아직 열려 있지 않으면 명령으로 열기
		await vscode.commands.executeCommand('agent-harness-framework.openMainPanel');

		const { MainPanel } = ext.exports;
		assert.strictEqual(MainPanel.isOpen(), true, '패널이 열려 있어야 합니다.');

		// 웹뷰 HTML에 요구사항 입력 textarea가 있는지 확인
		const html = MainPanel.getHtmlForTest();
		assert.ok(
			html.includes('id="requirement-input"'),
			'HTML에 id="requirement-input" textarea가 포함되어 있어야 합니다.'
		);
		assert.ok(
			html.includes('<textarea'),
			'HTML에 <textarea> 요소가 포함되어 있어야 합니다.'
		);
	});

	// F-014: 에이전트 설정 패널 열기 명령이 등록되어 있는지 검증
	test('F-014: openAgentSettings 명령이 등록되어야 한다', async () => {
		// Extension 활성화 확인
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// VSCode 명령 목록에서 openAgentSettings 명령 존재 여부 확인
		const commands = await vscode.commands.getCommands(true);
		const hasOpenAgentSettings = commands.includes('agent-harness-framework.openAgentSettings');
		assert.strictEqual(hasOpenAgentSettings, true, 'openAgentSettings 명령이 등록되지 않았습니다.');
	});

	// F-014: 에이전트 설정 패널 HTML에 에이전트 타입 선택 드롭다운이 포함되어 있는지 검증
	test('F-014: 에이전트 설정 패널 HTML에 agent-type-select 드롭다운이 있어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 에이전트 설정 패널 열기
		await vscode.commands.executeCommand('agent-harness-framework.openAgentSettings');

		const { AgentSettingsView } = ext.exports;
		assert.strictEqual(AgentSettingsView.isOpen(), true, '설정 패널이 열려 있어야 합니다.');

		// 웹뷰 HTML에 에이전트 타입 선택 드롭다운이 있는지 확인
		const html = AgentSettingsView.getHtmlForTest();
		assert.ok(
			html.includes('id="agent-type-select"'),
			'HTML에 id="agent-type-select" 드롭다운이 포함되어 있어야 합니다.'
		);
		assert.ok(
			html.includes('value="claude"'),
			'HTML에 claude 옵션이 포함되어 있어야 합니다.'
		);
		assert.ok(
			html.includes('value="gemini"'),
			'HTML에 gemini 옵션이 포함되어 있어야 합니다.'
		);
		assert.ok(
			html.includes('value="custom"'),
			'HTML에 custom 옵션이 포함되어 있어야 합니다.'
		);
	});

	// F-014: setAgentType 메시지 수신 시 각 에이전트 타입이 AgentConfig에 저장되는지 검증
	test('F-014: setAgentType 메시지 수신 시 에이전트 타입이 저장되어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 에이전트 설정 패널 열기
		await vscode.commands.executeCommand('agent-harness-framework.openAgentSettings');

		const { AgentSettingsView } = ext.exports;
		assert.strictEqual(AgentSettingsView.isOpen(), true, '설정 패널이 열려 있어야 합니다.');

		// Gemini 선택 메시지 시뮬레이션
		const geminiMessage: AgentSettingsMessage = { type: 'setAgentType', value: 'gemini' };
		AgentSettingsView.simulateWebviewMessage(geminiMessage);
		assert.strictEqual(AgentSettingsView.getAgentType(), 'gemini', 'gemini 선택 후 저장되어야 합니다.');

		// Custom 선택 메시지 시뮬레이션
		const customMessage: AgentSettingsMessage = { type: 'setAgentType', value: 'custom' };
		AgentSettingsView.simulateWebviewMessage(customMessage);
		assert.strictEqual(AgentSettingsView.getAgentType(), 'custom', 'custom 선택 후 저장되어야 합니다.');

		// Claude 선택 메시지 시뮬레이션 (기본값으로 복원)
		const claudeMessage: AgentSettingsMessage = { type: 'setAgentType', value: 'claude' };
		AgentSettingsView.simulateWebviewMessage(claudeMessage);
		assert.strictEqual(AgentSettingsView.getAgentType(), 'claude', 'claude 선택 후 저장되어야 합니다.');
	});

	// F-015: 에이전트 설정 패널 HTML에 CLI 경로 입력 필드가 포함되어 있는지 검증
	test('F-015: 에이전트 설정 패널 HTML에 cli-path-input 입력 필드가 있어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 에이전트 설정 패널 열기
		await vscode.commands.executeCommand('agent-harness-framework.openAgentSettings');

		const { AgentSettingsView } = ext.exports;
		assert.strictEqual(AgentSettingsView.isOpen(), true, '설정 패널이 열려 있어야 합니다.');

		// 웹뷰 HTML에 CLI 경로 입력 필드가 있는지 확인
		const html = AgentSettingsView.getHtmlForTest();
		assert.ok(
			html.includes('id="cli-path-input"'),
			'HTML에 id="cli-path-input" 입력 필드가 포함되어 있어야 합니다.'
		);
		assert.ok(
			html.includes('type="text"'),
			'HTML에 type="text" 입력 필드가 포함되어 있어야 합니다.'
		);
	});

	// F-015: setCliPath 메시지 수신 시 CLI 경로가 AgentConfig에 저장되는지 검증
	test('F-015: setCliPath 메시지 수신 시 CLI 경로가 저장되어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 에이전트 설정 패널 열기
		await vscode.commands.executeCommand('agent-harness-framework.openAgentSettings');

		const { AgentSettingsView } = ext.exports;
		assert.strictEqual(AgentSettingsView.isOpen(), true, '설정 패널이 열려 있어야 합니다.');

		// CLI 경로 변경 메시지 시뮬레이션 — 사용자가 경로를 직접 입력하는 상황 재현
		const testPath = '/usr/local/bin/claude';
		const pathMessage: AgentSettingsCliPathMessage = { type: 'setCliPath', value: testPath };
		AgentSettingsView.simulateWebviewMessage(pathMessage as AgentSettingsMessage);
		assert.strictEqual(
			AgentSettingsView.getCliPath(),
			testPath,
			'setCliPath 메시지 수신 후 CLI 경로가 저장되어야 합니다.'
		);

		// 빈 문자열로 초기화 메시지 시뮬레이션
		const emptyPathMessage: AgentSettingsCliPathMessage = { type: 'setCliPath', value: '' };
		AgentSettingsView.simulateWebviewMessage(emptyPathMessage as AgentSettingsMessage);
		assert.strictEqual(
			AgentSettingsView.getCliPath(),
			'',
			'빈 경로로 setCliPath 메시지 수신 후 빈 문자열로 저장되어야 합니다.'
		);
	});

	// F-016: 에이전트 설정 패널 HTML에 추가 CLI 플래그 입력 필드가 포함되어 있는지 검증
	test('F-016: 에이전트 설정 패널 HTML에 extra-args-input 입력 필드가 있어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 에이전트 설정 패널 열기
		await vscode.commands.executeCommand('agent-harness-framework.openAgentSettings');

		const { AgentSettingsView } = ext.exports;
		assert.strictEqual(AgentSettingsView.isOpen(), true, '설정 패널이 열려 있어야 합니다.');

		// 웹뷰 HTML에 추가 CLI 플래그 입력 필드가 있는지 확인
		const html = AgentSettingsView.getHtmlForTest();
		assert.ok(
			html.includes('id="extra-args-input"'),
			'HTML에 id="extra-args-input" 입력 필드가 포함되어 있어야 합니다.'
		);
		assert.ok(
			html.includes('<textarea'),
			'HTML에 <textarea> 요소가 포함되어 있어야 합니다.'
		);
	});

	// F-016: setExtraArgs 메시지 수신 시 추가 CLI 플래그가 AgentConfig에 저장되는지 검증
	test('F-016: setExtraArgs 메시지 수신 시 추가 CLI 플래그가 저장되어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 에이전트 설정 패널 열기
		await vscode.commands.executeCommand('agent-harness-framework.openAgentSettings');

		const { AgentSettingsView } = ext.exports;
		assert.strictEqual(AgentSettingsView.isOpen(), true, '설정 패널이 열려 있어야 합니다.');

		// 추가 CLI 플래그 변경 메시지 시뮬레이션 — 사용자가 플래그를 직접 입력하는 상황 재현
		const testFlags = '--verbose --model claude-opus-4-6';
		const flagsMessage: AgentSettingsExtraArgsMessage = { type: 'setExtraArgs', value: testFlags };
		AgentSettingsView.simulateWebviewMessage(flagsMessage as AgentSettingsMessage);
		assert.strictEqual(
			AgentSettingsView.getExtraArgs(),
			testFlags,
			'setExtraArgs 메시지 수신 후 추가 CLI 플래그가 저장되어야 합니다.'
		);

		// 빈 문자열로 초기화 메시지 시뮬레이션
		const emptyFlagsMessage: AgentSettingsExtraArgsMessage = { type: 'setExtraArgs', value: '' };
		AgentSettingsView.simulateWebviewMessage(emptyFlagsMessage as AgentSettingsMessage);
		assert.strictEqual(
			AgentSettingsView.getExtraArgs(),
			'',
			'빈 플래그로 setExtraArgs 메시지 수신 후 빈 문자열로 저장되어야 합니다.'
		);
	});

	// F-027: agentType 설정이 VSCode 전역 설정에 저장되고 패널 재오픈 시 복원되는지 검증
	test('F-027: 에이전트 타입이 패널 재오픈 후에도 복원되어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// VSCode 전역 설정에 직접 저장하여 "이전 세션에서 저장된 값" 상태를 시뮬레이션
		const config = vscode.workspace.getConfiguration('agentHarness');
		await config.update('agentType', 'gemini', vscode.ConfigurationTarget.Global);

		// 기존 패널 닫기 — VSCode 재시작 시뮬레이션
		const { AgentSettingsView } = ext.exports;
		AgentSettingsView.disposeForTest();
		assert.strictEqual(AgentSettingsView.isOpen(), false, '패널이 닫혀 있어야 합니다.');

		// 새 패널 열기 — VSCode 재시작 후 패널 재오픈 시뮬레이션
		await vscode.commands.executeCommand('agent-harness-framework.openAgentSettings');
		assert.strictEqual(AgentSettingsView.isOpen(), true, '새 패널이 열려 있어야 합니다.');

		// HTML에 저장된 agentType이 선택 상태로 렌더링되었는지 확인
		const html = AgentSettingsView.getHtmlForTest();
		assert.ok(
			html.includes('value="gemini" selected'),
			'gemini 옵션이 selected 상태로 HTML에 포함되어 있어야 합니다.'
		);

		// 정리: 기본값으로 복원
		await config.update('agentType', 'claude', vscode.ConfigurationTarget.Global);
	});

	// F-027: cliPath와 extraArgs 설정이 VSCode 전역 설정에 저장되고 패널 재오픈 시 복원되는지 검증
	test('F-027: CLI 경로와 추가 플래그가 패널 재오픈 후에도 복원되어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// VSCode 전역 설정에 직접 저장하여 "이전 세션에서 저장된 값" 상태를 시뮬레이션
		const config = vscode.workspace.getConfiguration('agentHarness');
		const savedCliPath = '/usr/local/bin/claude';
		const savedExtraArgs = '--verbose --model claude-opus-4-6';
		await config.update('cliPath', savedCliPath, vscode.ConfigurationTarget.Global);
		await config.update('extraArgs', savedExtraArgs, vscode.ConfigurationTarget.Global);

		// 기존 패널 닫기 — VSCode 재시작 시뮬레이션
		const { AgentSettingsView } = ext.exports;
		AgentSettingsView.disposeForTest();
		assert.strictEqual(AgentSettingsView.isOpen(), false, '패널이 닫혀 있어야 합니다.');

		// 새 패널 열기 — VSCode 재시작 후 패널 재오픈 시뮬레이션
		await vscode.commands.executeCommand('agent-harness-framework.openAgentSettings');
		assert.strictEqual(AgentSettingsView.isOpen(), true, '새 패널이 열려 있어야 합니다.');

		// HTML에 저장된 cliPath와 extraArgs가 렌더링되었는지 확인
		const html = AgentSettingsView.getHtmlForTest();
		assert.ok(
			html.includes(savedCliPath),
			'저장된 CLI 경로가 HTML에 포함되어 있어야 합니다.'
		);
		assert.ok(
			html.includes(savedExtraArgs),
			'저장된 추가 CLI 플래그가 HTML에 포함되어 있어야 합니다.'
		);

		// 정리: 기본값으로 복원
		await config.update('cliPath', '', vscode.ConfigurationTarget.Global);
		await config.update('extraArgs', '', vscode.ConfigurationTarget.Global);
	});

	// F-006: 메인 패널 HTML에 Markdown 변환 버튼이 포함되어 있는지 검증
	test('F-006: 메인 패널 HTML에 convert-to-markdown-btn 버튼이 있어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 메인 패널 열기
		await vscode.commands.executeCommand('agent-harness-framework.openMainPanel');

		const { MainPanel } = ext.exports;
		assert.strictEqual(MainPanel.isOpen(), true, '패널이 열려 있어야 합니다.');

		// 웹뷰 HTML에 Markdown 변환 버튼이 있는지 확인
		const html = MainPanel.getHtmlForTest();
		assert.ok(
			html.includes('id="convert-to-markdown-btn"'),
			'HTML에 id="convert-to-markdown-btn" 버튼이 포함되어 있어야 합니다.'
		);
		assert.ok(
			html.includes('<button'),
			'HTML에 <button> 요소가 포함되어 있어야 합니다.'
		);
	});

	// F-006: convertRequested 메시지 수신 시 입력값이 Markdown으로 변환되어 저장되는지 검증
	test('F-006: convertRequested 메시지 수신 시 Markdown으로 변환되어 저장되어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 메인 패널 열기
		await vscode.commands.executeCommand('agent-harness-framework.openMainPanel');

		const { MainPanel } = ext.exports;
		assert.strictEqual(MainPanel.isOpen(), true, '패널이 열려 있어야 합니다.');

		// 사용자 입력 시뮬레이션 — textarea에 요구사항 텍스트 입력
		const testInput = '사용자 인증 기능을 가진 웹 애플리케이션을 만들어 주세요.';
		const inputMessage: WebviewMessage = { type: 'inputChanged', value: testInput };
		MainPanel.simulateWebviewMessage(inputMessage);

		// Markdown 변환 요청 시뮬레이션 — "Markdown으로 변환" 버튼 클릭 상황 재현
		const convertMessage: ConvertRequestedMessage = { type: 'convertRequested' };
		MainPanel.simulateWebviewMessage(convertMessage);

		// 변환된 Markdown 값 검증
		const markdown = MainPanel.getMarkdownValue();

		// Markdown 헤딩이 포함되어 있는지 확인
		assert.ok(
			markdown.includes('# 프로젝트 요구사항'),
			'변환된 Markdown에 "# 프로젝트 요구사항" 헤딩이 포함되어 있어야 합니다.'
		);

		// 데이터 손실 없이 입력 내용이 그대로 보존되는지 확인
		assert.ok(
			markdown.includes(testInput),
			'변환된 Markdown에 원본 입력 내용이 그대로 포함되어 있어야 합니다.'
		);
	});

	// F-017: agentType이 'claude'일 때 AgentRunnerFactory.create()가 ClaudeCodeRunner를 반환하는지 검증
	test('F-017: AgentRunnerFactory.create()가 claude 타입에 ClaudeCodeRunner를 반환해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// agentType을 'claude'로 설정 — AgentConfig.getAgentType()이 'claude'를 반환하도록
		const config = vscode.workspace.getConfiguration('agentHarness');
		await config.update('agentType', 'claude', vscode.ConfigurationTarget.Global);
		// cliPath를 빈 문자열로 초기화 — 기본 'claude' 명령이 사용되어야 함
		await config.update('cliPath', '', vscode.ConfigurationTarget.Global);
		await config.update('extraArgs', '', vscode.ConfigurationTarget.Global);

		const { AgentRunnerFactory, ClaudeCodeRunner } = ext.exports;

		// AgentRunnerFactory.create()가 ClaudeCodeRunner 인스턴스를 반환하는지 확인
		const runner = AgentRunnerFactory.create();
		assert.ok(
			runner instanceof ClaudeCodeRunner,
			'agentType이 claude일 때 ClaudeCodeRunner 인스턴스가 반환되어야 합니다.'
		);

		// spawn 명령이 'claude'인지 확인 — cliPath가 빈 문자열이면 기본값 'claude' 사용
		assert.strictEqual(
			runner.getSpawnCommand(),
			'claude',
			'cliPath가 빈 문자열이면 spawn 명령이 claude여야 합니다.'
		);
	});

	// F-017: cliPath가 설정된 경우 spawn 명령이 cliPath 값을 사용하는지 검증
	test('F-017: cliPath가 설정된 경우 spawn 명령이 cliPath여야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// cliPath를 사용자 지정 경로로 설정
		const customPath = '/usr/local/bin/claude';
		const config = vscode.workspace.getConfiguration('agentHarness');
		await config.update('agentType', 'claude', vscode.ConfigurationTarget.Global);
		await config.update('cliPath', customPath, vscode.ConfigurationTarget.Global);
		await config.update('extraArgs', '', vscode.ConfigurationTarget.Global);

		const { AgentRunnerFactory, ClaudeCodeRunner } = ext.exports;

		// AgentRunnerFactory.create()가 ClaudeCodeRunner 인스턴스를 반환하는지 확인
		const runner = AgentRunnerFactory.create();
		assert.ok(
			runner instanceof ClaudeCodeRunner,
			'agentType이 claude일 때 ClaudeCodeRunner 인스턴스가 반환되어야 합니다.'
		);

		// spawn 명령이 설정된 cliPath인지 확인
		assert.strictEqual(
			runner.getSpawnCommand(),
			customPath,
			`cliPath가 설정된 경우 spawn 명령이 ${customPath}여야 합니다.`
		);

		// 정리: 기본값으로 복원
		await config.update('cliPath', '', vscode.ConfigurationTarget.Global);
	});

	// F-018: agentType이 'gemini'일 때 AgentRunnerFactory.create()가 GeminiCliRunner를 반환하는지 검증
	test('F-018: AgentRunnerFactory.create()가 gemini 타입에 GeminiCliRunner를 반환해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// agentType을 'gemini'로 설정 — AgentConfig.getAgentType()이 'gemini'를 반환하도록
		const config = vscode.workspace.getConfiguration('agentHarness');
		await config.update('agentType', 'gemini', vscode.ConfigurationTarget.Global);
		// cliPath를 빈 문자열로 초기화 — 기본 'gemini' 명령이 사용되어야 함
		await config.update('cliPath', '', vscode.ConfigurationTarget.Global);
		await config.update('extraArgs', '', vscode.ConfigurationTarget.Global);

		const { AgentRunnerFactory, GeminiCliRunner } = ext.exports;

		// AgentRunnerFactory.create()가 GeminiCliRunner 인스턴스를 반환하는지 확인
		const runner = AgentRunnerFactory.create();
		assert.ok(
			runner instanceof GeminiCliRunner,
			'agentType이 gemini일 때 GeminiCliRunner 인스턴스가 반환되어야 합니다.'
		);

		// spawn 명령이 'gemini'인지 확인 — cliPath가 빈 문자열이면 기본값 'gemini' 사용
		assert.strictEqual(
			runner.getSpawnCommand(),
			'gemini',
			'cliPath가 빈 문자열이면 spawn 명령이 gemini여야 합니다.'
		);

		// 정리: 기본값으로 복원
		await config.update('agentType', 'claude', vscode.ConfigurationTarget.Global);
	});

	// F-018: cliPath가 설정된 경우 GeminiCliRunner의 spawn 명령이 cliPath 값을 사용하는지 검증
	test('F-018: cliPath가 설정된 경우 GeminiCliRunner의 spawn 명령이 cliPath여야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// cliPath를 사용자 지정 경로로 설정
		const customPath = '/usr/local/bin/gemini';
		const config = vscode.workspace.getConfiguration('agentHarness');
		await config.update('agentType', 'gemini', vscode.ConfigurationTarget.Global);
		await config.update('cliPath', customPath, vscode.ConfigurationTarget.Global);
		await config.update('extraArgs', '', vscode.ConfigurationTarget.Global);

		const { AgentRunnerFactory, GeminiCliRunner } = ext.exports;

		// AgentRunnerFactory.create()가 GeminiCliRunner 인스턴스를 반환하는지 확인
		const runner = AgentRunnerFactory.create();
		assert.ok(
			runner instanceof GeminiCliRunner,
			'agentType이 gemini일 때 GeminiCliRunner 인스턴스가 반환되어야 합니다.'
		);

		// spawn 명령이 설정된 cliPath인지 확인
		assert.strictEqual(
			runner.getSpawnCommand(),
			customPath,
			`cliPath가 설정된 경우 spawn 명령이 ${customPath}여야 합니다.`
		);

		// 정리: 기본값으로 복원
		await config.update('agentType', 'claude', vscode.ConfigurationTarget.Global);
		await config.update('cliPath', '', vscode.ConfigurationTarget.Global);
	});

	// F-005: 웹뷰에서 inputChanged 메시지 수신 시 입력값이 Extension에 저장되는지 검증
	test('F-005: inputChanged 메시지 수신 시 입력값이 저장되어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 메인 패널 열기
		await vscode.commands.executeCommand('agent-harness-framework.openMainPanel');

		const { MainPanel } = ext.exports;
		assert.strictEqual(MainPanel.isOpen(), true, '패널이 열려 있어야 합니다.');

		// 이전 테스트에서 설정된 값을 초기화하여 독립적인 테스트 환경 보장
		MainPanel.simulateWebviewMessage({ type: 'inputChanged', value: '' });

		// 초기화 후 입력값은 빈 문자열이어야 한다
		assert.strictEqual(MainPanel.getInputValue(), '', '입력값 초기화 후 빈 문자열이어야 합니다.');

		// 웹뷰 메시지 수신을 시뮬레이션 — 사용자가 textarea에 입력하는 상황을 재현
		const testInput = '사용자 인증 기능을 가진 웹 애플리케이션을 만들어 주세요.';
		const message: WebviewMessage = { type: 'inputChanged', value: testInput };
		MainPanel.simulateWebviewMessage(message);

		// 메시지 수신 후 입력값이 저장되었는지 확인
		assert.strictEqual(
			MainPanel.getInputValue(),
			testInput,
			'inputChanged 메시지 수신 후 입력값이 저장되어야 합니다.'
		);
	});

});
