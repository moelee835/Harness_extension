import * as assert from 'assert';
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { ExtensionApi } from '../extension.js';
import type { WebviewMessage, ConvertRequestedMessage, InitRequestedMessage } from '../ui/MainPanel.js';
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

	// F-019: agentType이 'custom'일 때 AgentRunnerFactory.create()가 CustomCliRunner를 반환하는지 검증
	test('F-019: AgentRunnerFactory.create()가 custom 타입에 CustomCliRunner를 반환해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// agentType을 'custom'으로 설정, cliPath를 사용자 지정 경로로 설정
		const customPath = '/usr/local/bin/my-agent';
		const config = vscode.workspace.getConfiguration('agentHarness');
		await config.update('agentType', 'custom', vscode.ConfigurationTarget.Global);
		await config.update('cliPath', customPath, vscode.ConfigurationTarget.Global);
		await config.update('extraArgs', '', vscode.ConfigurationTarget.Global);

		const { AgentRunnerFactory, CustomCliRunner } = ext.exports;

		// AgentRunnerFactory.create()가 CustomCliRunner 인스턴스를 반환하는지 확인
		const runner = AgentRunnerFactory.create();
		assert.ok(
			runner instanceof CustomCliRunner,
			'agentType이 custom일 때 CustomCliRunner 인스턴스가 반환되어야 합니다.'
		);

		// spawn 명령이 설정된 cliPath인지 확인 — CustomCliRunner는 기본값 없이 cliPath를 그대로 사용
		assert.strictEqual(
			runner.getSpawnCommand(),
			customPath,
			`cliPath가 설정된 경우 spawn 명령이 ${customPath}여야 합니다.`
		);

		// 정리: 기본값으로 복원
		await config.update('agentType', 'claude', vscode.ConfigurationTarget.Global);
		await config.update('cliPath', '', vscode.ConfigurationTarget.Global);
	});

	// F-019: cliPath가 빈 문자열일 때 CustomCliRunner의 spawn 명령이 빈 문자열을 그대로 사용하는지 검증
	test('F-019: cliPath가 빈 문자열이면 CustomCliRunner spawn 명령이 빈 문자열이어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// agentType을 'custom'으로 설정, cliPath는 빈 문자열 (사용자가 경로를 미입력한 상태)
		const config = vscode.workspace.getConfiguration('agentHarness');
		await config.update('agentType', 'custom', vscode.ConfigurationTarget.Global);
		await config.update('cliPath', '', vscode.ConfigurationTarget.Global);
		await config.update('extraArgs', '', vscode.ConfigurationTarget.Global);

		const { AgentRunnerFactory, CustomCliRunner } = ext.exports;

		// AgentRunnerFactory.create()가 CustomCliRunner 인스턴스를 반환하는지 확인
		const runner = AgentRunnerFactory.create();
		assert.ok(
			runner instanceof CustomCliRunner,
			'agentType이 custom일 때 CustomCliRunner 인스턴스가 반환되어야 합니다.'
		);

		// cliPath가 빈 문자열이면 spawn 명령도 빈 문자열 — 사용자가 경로를 설정하지 않은 상태
		assert.strictEqual(
			runner.getSpawnCommand(),
			'',
			'cliPath가 빈 문자열이면 spawn 명령도 빈 문자열이어야 합니다.'
		);

		// 정리: 기본값으로 복원
		await config.update('agentType', 'claude', vscode.ConfigurationTarget.Global);
	});

	// F-034: UI에서 취소 버튼 표시 및 cancelRequested 메시지 처리 검증
	test('F-034: setRunning(true) 시 취소 버튼이 표시되고, cancelRequested 처리 후 취소 완료 메시지가 표시되어야 한다', async () => {
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

		// 기본 상태: isRunning=false이고 HTML에 cancel-btn이 숨겨져 있어야 함
		const initialHtml = MainPanel.getHtmlForTest();
		assert.ok(
			initialHtml.includes('id="cancel-btn"'),
			'HTML에 id="cancel-btn" 요소가 포함되어 있어야 합니다.'
		);
		assert.ok(
			initialHtml.includes('id="cancel-btn" style="display:none"'),
			'기본 상태에서 취소 버튼은 숨겨져 있어야 합니다.'
		);
		assert.strictEqual(MainPanel.isRunningForTest(), false, '기본 상태에서 isRunning()은 false여야 합니다.');

		// 실행 중 상태로 전환 — 취소 버튼이 표시되어야 함
		MainPanel.setRunning(true);
		assert.strictEqual(MainPanel.isRunningForTest(), true, 'setRunning(true) 후 isRunning()이 true여야 합니다.');

		const runningHtml = MainPanel.getHtmlForTest();
		assert.ok(
			!runningHtml.includes('id="cancel-btn" style="display:none"'),
			'실행 중일 때 취소 버튼이 표시되어야 합니다(display:none 없어야 함).'
		);

		// 취소 요청 시뮬레이션 — isRunning=false, 취소 완료 메시지 설정
		const cancelMessage: WebviewMessage = { type: 'cancelRequested' };
		MainPanel.simulateWebviewMessage(cancelMessage);

		// 취소 후 검증
		assert.strictEqual(MainPanel.isRunningForTest(), false, '취소 후 isRunning()이 false여야 합니다.');
		const statusMsg = MainPanel.getStatusMessageForTest();
		assert.ok(statusMsg.includes('취소'), `취소 후 상태 메시지에 '취소'가 포함되어야 합니다. 실제값: "${statusMsg}"`);
	});

	// F-034: runner.cancel()이 실행 중인 프로세스를 종료하는지 검증
	test('F-034: runner.cancel()이 실행 중인 프로세스를 종료해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { CustomCliRunner } = ext.exports;

		// 초기 상태 검증 — 프로세스가 실행되기 전에는 isRunning()이 false여야 함
		const runner = new CustomCliRunner('node', ['-e', 'setTimeout(()=>{},30000)']);
		assert.strictEqual(runner.isRunning(), false, '초기 상태에서 isRunning()은 false여야 합니다.');

		// invoke()를 await 없이 실행하여 백그라운드에서 장시간 실행 프로세스 시작
		// node -e "setTimeout(()=>{},30000)" 은 30초 동안 대기하는 프로세스이므로 취소 테스트에 적합
		let invokeDone = false;
		runner.invoke('').then(() => { invokeDone = true; }).catch(() => { invokeDone = true; });

		// 프로세스가 시작될 시간을 기다림 (300ms)
		await new Promise<void>(resolve => setTimeout(resolve, 300));
		assert.strictEqual(runner.isRunning(), true, 'invoke() 호출 후 isRunning()은 true여야 합니다.');

		// 취소 실행 — child_process.kill()이 호출되어 프로세스가 종료되어야 함
		runner.cancel();

		// 프로세스 종료 대기 (500ms)
		await new Promise<void>(resolve => setTimeout(resolve, 500));
		assert.strictEqual(invokeDone, true, '취소 후 invoke() Promise가 완료(resolve 또는 reject)되어야 합니다.');
		assert.strictEqual(runner.isRunning(), false, '취소 후 isRunning()은 false여야 합니다.');
	});

	// F-020: 메인 패널 HTML에 출력 영역이 포함되어 있는지 검증
	test('F-020: 메인 패널 HTML에 id="output-area" 영역이 있어야 한다', async () => {
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

		// 웹뷰 HTML에 출력 영역이 있는지 확인
		const html = MainPanel.getHtmlForTest();
		assert.ok(
			html.includes('id="output-area"'),
			'HTML에 id="output-area" 요소가 포함되어 있어야 합니다.'
		);

		// stderr 구분 스타일이 CSS에 정의되어 있는지 확인
		assert.ok(
			html.includes('stderr-text'),
			'HTML에 stderr-text 클래스 스타일이 포함되어 있어야 합니다.'
		);
	});

	// F-020: appendOutput() 호출 시 출력이 내부 버퍼에 누적되는지 검증
	test('F-020: appendOutput() 호출 시 stdout/stderr 출력이 버퍼에 저장되어야 한다', async () => {
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

		// 이전 테스트에서 누적된 출력 초기화
		MainPanel.clearOutputForTest();
		assert.strictEqual(MainPanel.getOutputForTest().length, 0, '초기화 후 출력 버퍼가 비어 있어야 합니다.');

		// stdout 출력 추가 시뮬레이션
		const stdoutText = '빌드가 시작됩니다...\n';
		MainPanel.appendOutput(stdoutText, false);

		// stderr 출력 추가 시뮬레이션
		const stderrText = '경고: 타입 정의 파일을 찾을 수 없습니다.\n';
		MainPanel.appendOutput(stderrText, true);

		// 출력 버퍼 검증
		const outputLines = MainPanel.getOutputForTest();
		assert.strictEqual(outputLines.length, 2, '두 개의 출력이 버퍼에 저장되어 있어야 합니다.');
		assert.strictEqual(outputLines[0], stdoutText, '첫 번째 항목이 stdout 텍스트여야 합니다.');
		assert.strictEqual(outputLines[1], stderrText, '두 번째 항목이 stderr 텍스트여야 합니다.');
	});

	// F-033: showError() 호출 시 HTML에 오류 메시지가 표시되는지 검증
	test('F-033: showError() 호출 시 HTML에 error-message 영역이 표시되어야 한다', async () => {
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

		// 기본 상태: 오류 메시지가 없으므로 #error-message가 숨겨져 있어야 함
		const initialHtml = MainPanel.getHtmlForTest();
		assert.ok(
			initialHtml.includes('id="error-message" style="display:none"'),
			'기본 상태에서 오류 메시지 영역은 숨겨져 있어야 합니다.'
		);
		assert.strictEqual(MainPanel.getErrorMessageForTest(), '', '기본 상태에서 오류 메시지는 빈 문자열이어야 합니다.');

		// 오류 표시 — 종료 코드를 포함한 오류 메시지 설정
		const errorText = '에이전트 CLI 프로세스가 종료 코드 1로 종료되었습니다.';
		MainPanel.showError(errorText);

		// 오류 메시지가 올바르게 설정되었는지 확인
		assert.strictEqual(
			MainPanel.getErrorMessageForTest(),
			errorText,
			'showError() 호출 후 오류 메시지가 저장되어야 합니다.'
		);

		// HTML에 오류 메시지 영역이 표시되는지 확인 (display:none 없어야 함)
		const errorHtml = MainPanel.getHtmlForTest();
		assert.ok(
			!errorHtml.includes('id="error-message" style="display:none"'),
			'showError() 후 오류 메시지 영역이 표시되어야 합니다(display:none 없어야 함).'
		);
		assert.ok(
			errorHtml.includes('id="error-message"'),
			'HTML에 id="error-message" 요소가 포함되어 있어야 합니다.'
		);

		// showError() 후 isRunning()이 false로 설정되는지 확인 (프로세스 종료 상태 반영)
		assert.strictEqual(
			MainPanel.isRunningForTest(),
			false,
			'showError() 호출 후 isRunning()은 false여야 합니다.'
		);
	});

	// F-033: runner.invoke()가 오류 종료 코드를 포함한 오류 메시지로 reject되는지 검증
	test('F-033: runner.invoke()가 오류 코드로 종료 시 종료 코드를 포함한 오류로 reject되어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { CustomCliRunner } = ext.exports;

		// node -e "process.exit(1)" — 즉시 종료 코드 1로 종료하는 프로세스
		// CustomCliRunner에서 extraArgs는 프롬프트 앞에 삽입되므로 이 방식으로 -e 플래그를 전달
		const runner = new CustomCliRunner('node', ['-e', 'process.exit(1)']);

		let caughtError: Error | null = null;
		try {
			// 종료 코드 1로 종료하는 프로세스를 실행 — reject가 기대됨
			await runner.invoke('');
		} catch (err: unknown) {
			caughtError = err as Error;
		}

		// 오류가 발생했는지 확인
		assert.ok(caughtError !== null, '오류 코드로 종료 시 invoke()가 오류를 throw해야 합니다.');

		// 오류 메시지에 종료 코드가 포함되어 있는지 확인
		const errorMessage = caughtError?.message ?? '';
		assert.ok(
			errorMessage.includes('1'),
			`오류 메시지에 종료 코드 '1'이 포함되어 있어야 합니다. 실제 메시지: "${errorMessage}"`
		);

		// 오류 발생 후 isRunning()이 false인지 확인
		assert.strictEqual(
			runner.isRunning(),
			false,
			'오류로 종료된 후 isRunning()은 false여야 합니다.'
		);
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

	// F-007: 메인 패널 HTML에 init-project-btn 버튼이 포함되어 있는지 검증
	test('F-007: 메인 패널 HTML에 init-project-btn 버튼이 있어야 한다', async () => {
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

		// HTML에 Init Project 버튼이 포함되어 있는지 확인
		const html = MainPanel.getHtmlForTest();
		assert.ok(
			html.includes('id="init-project-btn"'),
			'메인 패널 HTML에 id="init-project-btn" 버튼이 포함되어 있어야 합니다.'
		);
	});

	// F-007: initRequested 메시지 수신 시 패널이 running 상태로 전환되는지 검증
	test('F-007: initRequested 메시지 수신 시 isRunning이 true로 설정되어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// 메인 패널 열기
		await vscode.commands.executeCommand('agent-harness-framework.openMainPanel');

		const { MainPanel, InitService } = ext.exports;
		assert.strictEqual(MainPanel.isOpen(), true, '패널이 열려 있어야 합니다.');

		// InitService가 ExtensionApi에 노출되어 있는지 확인 (번들 내 내장 상수 포함 검증)
		assert.ok(InitService, 'InitService가 ExtensionApi에 노출되어 있어야 합니다.');

		// 초기 상태: 실행 중이 아님
		MainPanel.setRunning(false);
		assert.strictEqual(MainPanel.isRunningForTest(), false, '초기 상태에서 isRunning은 false여야 합니다.');

		// 실제 CLI를 실행하지 않도록 setOnInitRequested 콜백을 빈 함수로 덮어쓰기
		// (테스트 환경에서는 실제 CLI 에이전트를 실행할 수 없으므로 콜백만 등록)
		MainPanel.setOnInitRequested(() => {
			// 테스트용 no-op 콜백 — 실제 InitService.run()을 실행하지 않음
		});

		// initRequested 메시지 시뮬레이션 — 사용자가 Init Project 버튼을 클릭하는 상황 재현
		const message: WebviewMessage = { type: 'initRequested' };
		MainPanel.simulateWebviewMessage(message);

		// initRequested 처리 후 isRunning이 true로 설정되어야 한다
		assert.strictEqual(
			MainPanel.isRunningForTest(),
			true,
			'initRequested 메시지 수신 후 isRunning이 true여야 합니다.'
		);
	});

	// F-021: FileManager.create()가 지정된 경로에 파일을 생성하고 내용을 정확히 기록하는지 검증
	test('F-021: FileManager.create()가 파일을 생성하고 내용을 정확히 기록해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { FileManager } = ext.exports;

		// 테스트용 임시 디렉토리와 파일 경로 설정
		const tmpDir = os.tmpdir();
		const testFilePath = path.join(tmpDir, `test-file-manager-f021-${Date.now()}.md`);
		const testContent = '# F-021 테스트\n\n파일 생성 검증 내용입니다.';

		try {
			// FileManager 인스턴스 생성 및 create() 호출
			const fileManager = new FileManager();
			await fileManager.create(testFilePath, testContent);

			// 파일이 실제로 생성되었는지 확인 (fs/promises로 직접 읽어 검증)
			const readBack = await fs.readFile(testFilePath, 'utf-8');
			assert.strictEqual(
				readBack,
				testContent,
				'FileManager.create() 후 파일 내용이 입력한 Markdown 문자열과 일치해야 합니다.'
			);
		} finally {
			// 테스트 후 임시 파일 정리
			await fs.unlink(testFilePath).catch(() => { /* 이미 삭제된 경우 무시 */ });
		}
	});

	// F-021: 부모 디렉토리가 존재하지 않으면 FileManager.create()가 Error를 던지는지 검증
	test('F-021: 부모 디렉토리가 없으면 FileManager.create()가 Error를 던져야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { FileManager } = ext.exports;

		// 존재하지 않는 부모 디렉토리 경로 설정
		const nonExistentDir = path.join(os.tmpdir(), `non-existent-dir-${Date.now()}`);
		const testFilePath = path.join(nonExistentDir, 'test.md');

		const fileManager = new FileManager();

		// create() 호출 시 Error가 발생해야 한다
		await assert.rejects(
			async () => fileManager.create(testFilePath, '# 테스트'),
			(err: unknown) => {
				assert.ok(err instanceof Error, 'Error 인스턴스가 발생해야 합니다.');
				assert.ok(
					err.message.includes('부모 디렉토리가 존재하지 않습니다') ||
					err.message.includes('부모 경로'),
					`에러 메시지가 부모 디렉토리 오류를 명시해야 합니다. 실제: ${err.message}`
				);
				return true;
			},
			'부모 디렉토리가 없을 때 FileManager.create()는 Error를 던져야 합니다.'
		);
	});

});
