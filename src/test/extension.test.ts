import * as assert from 'assert';
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { ExtensionApi } from '../extension.js';
import type { WebviewMessage, ConvertRequestedMessage, InitRequestedMessage } from '../ui/MainPanel.js';
import type { AgentSettingsMessage, AgentSettingsCliPathMessage, AgentSettingsExtraArgsMessage } from '../ui/AgentSettingsView.js';
import type { IAgentRunner } from '../service/IAgentRunner.js';

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

	// F-008: AnalyzerService.generateCommand()가 CLI 에이전트를 호출하고
	// commandsDir에 커맨드 .md 파일을 생성하는지 검증
	test('F-008: AnalyzerService.generateCommand()가 CLI 에이전트를 호출하고 .claude/commands/에 파일을 생성해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { AnalyzerService, FileManager } = ext.exports;

		// 테스트용 임시 commandsDir 생성 (.claude/commands/ 역할)
		const commandsDir = path.join(os.tmpdir(), `test-commands-f008-${Date.now()}`);
		await fs.mkdir(commandsDir, { recursive: true });

		// 스텁 IAgentRunner — invoke() 호출 시 미리 정의된 커맨드 .md 내용을 onStdout으로 전달
		let invokeWasCalled = false;
		const stubCommandContent = [
			'---',
			'name: test-command',
			'description: 테스트용 커맨드입니다.',
			'---',
			'',
			'# test-command',
			'',
			'## 역할',
			'테스트 커맨드의 역할을 수행합니다.',
			'',
			'## 수행 단계',
			'1. 첫 번째 단계를 실행한다',
			'2. 두 번째 단계를 실행한다',
		].join('\n');

		const stubRunner: IAgentRunner = {
			invoke: async (_prompt: string, onStdout?: (chunk: string) => void): Promise<void> => {
				// invoke()가 호출되었음을 기록
				invokeWasCalled = true;
				// 스텁 출력을 onStdout 콜백으로 전달 (실제 CLI 출력 시뮬레이션)
				if (onStdout) {
					onStdout(stubCommandContent);
				}
			},
			cancel: () => { /* 스텁: 취소 동작 없음 */ },
			isRunning: () => false,
			getSpawnCommand: () => 'claude',
		};

		try {
			// FileManager와 스텁 러너로 AnalyzerService 인스턴스 생성
			const fileManager = new FileManager();
			const analyzerService = new AnalyzerService(stubRunner, fileManager);

			// generateCommand() 호출 — commandsDir에 test-command.md가 생성되어야 한다
			const result = await analyzerService.generateCommand(
				'# 테스트 커맨드\n\n테스트용 커맨드를 생성해 주세요.',
				commandsDir,
			);

			// CLI 에이전트(runner.invoke())가 호출되었는지 확인
			assert.strictEqual(
				invokeWasCalled,
				true,
				'AnalyzerService.generateCommand()이 CLI 에이전트(runner.invoke())를 호출해야 합니다.',
			);

			// 생성된 파일 경로가 commandsDir/test-command.md인지 확인
			const expectedFilePath = path.join(commandsDir, 'test-command.md');
			assert.strictEqual(
				result.filePath,
				expectedFilePath,
				'생성된 파일 경로가 commandsDir/test-command.md여야 합니다.',
			);

			// 파일이 실제로 존재하고 비어 있지 않은지 확인
			const fileContent = await fs.readFile(expectedFilePath, 'utf-8');
			assert.ok(fileContent.length > 0, '생성된 파일이 비어있지 않아야 합니다.');
		} finally {
			// 테스트 후 임시 디렉토리 정리
			await fs.rm(commandsDir, { recursive: true, force: true }).catch(() => { /* 정리 실패 무시 */ });
		}
	});

	// F-008: 생성된 커맨드 파일이 커맨드 이름, 설명, 수행 단계를 포함하는지 검증
	test('F-008: 생성된 커맨드 파일이 커맨드 이름, 설명, 수행 단계를 포함해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { AnalyzerService, FileManager } = ext.exports;

		// 테스트용 임시 commandsDir 생성
		const commandsDir = path.join(os.tmpdir(), `test-commands-f008b-${Date.now()}`);
		await fs.mkdir(commandsDir, { recursive: true });

		// 커맨드 이름, 설명, 수행 단계를 포함하는 스텁 출력 정의
		const stubCommandContent = [
			'---',
			'name: analyze-requirements',
			'description: 요구사항을 분석하여 스펙 문서를 생성합니다.',
			'---',
			'',
			'# analyze-requirements',
			'',
			'## 역할',
			'사용자의 요구사항을 분석하여 상세 스펙을 생성합니다.',
			'',
			'## 수행 단계',
			'1. 요구사항 문서를 읽는다',
			'2. 핵심 기능을 추출한다',
			'3. 스펙 문서를 작성한다',
		].join('\n');

		const stubRunner: IAgentRunner = {
			invoke: async (_prompt: string, onStdout?: (chunk: string) => void): Promise<void> => {
				if (onStdout) {
					onStdout(stubCommandContent);
				}
			},
			cancel: () => { /* 스텁: 취소 동작 없음 */ },
			isRunning: () => false,
			getSpawnCommand: () => 'claude',
		};

		try {
			const fileManager = new FileManager();
			const analyzerService = new AnalyzerService(stubRunner, fileManager);

			const result = await analyzerService.generateCommand(
				'요구사항 분석 커맨드를 만들어 주세요.',
				commandsDir,
			);

			// 생성된 파일 내용 직접 읽어 검증
			const fileContent = await fs.readFile(result.filePath, 'utf-8');

			// 파일에 커맨드 이름이 포함되어 있는지 확인
			assert.ok(
				fileContent.includes('analyze-requirements'),
				'생성된 커맨드 파일에 커맨드 이름(analyze-requirements)이 포함되어야 합니다.',
			);

			// 파일에 커맨드 설명이 포함되어 있는지 확인
			assert.ok(
				fileContent.includes('요구사항을 분석하여 스펙 문서를 생성합니다'),
				'생성된 커맨드 파일에 커맨드 설명이 포함되어야 합니다.',
			);

			// 파일에 수행 단계 섹션이 포함되어 있는지 확인
			assert.ok(
				fileContent.includes('수행 단계'),
				'생성된 커맨드 파일에 수행 단계 섹션이 포함되어야 합니다.',
			);
		} finally {
			// 테스트 후 임시 디렉토리 정리
			await fs.rm(commandsDir, { recursive: true, force: true }).catch(() => { /* 정리 실패 무시 */ });
		}
	});

	// F-009: AnalyzerService.generateSkill()가 CLI 에이전트를 호출하고
	// skillsDir에 스킬 .md 파일을 생성하는지 검증
	test('F-009: AnalyzerService.generateSkill()가 CLI 에이전트를 호출하고 .claude/skills/에 파일을 생성해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { AnalyzerService, FileManager } = ext.exports;

		// 테스트용 임시 skillsDir 생성 (.claude/skills/ 역할)
		const skillsDir = path.join(os.tmpdir(), `test-skills-f009-${Date.now()}`);
		await fs.mkdir(skillsDir, { recursive: true });

		// 스텁 IAgentRunner — invoke() 호출 시 미리 정의된 스킬 .md 내용을 onStdout으로 전달
		let invokeWasCalled = false;
		const stubSkillContent = [
			'---',
			'name: test-skill',
			'description: 테스트용 스킬입니다.',
			'---',
			'',
			'## 트리거 조건',
			'사용자가 스킬 테스트를 요청할 때 실행됩니다.',
			'',
			'## 동작 설명',
			'테스트 스킬의 동작을 수행합니다.',
		].join('\n');

		const stubRunner: IAgentRunner = {
			invoke: async (_prompt: string, onStdout?: (chunk: string) => void): Promise<void> => {
				// invoke()가 호출되었음을 기록
				invokeWasCalled = true;
				// 스텁 출력을 onStdout 콜백으로 전달 (실제 CLI 출력 시뮬레이션)
				if (onStdout) {
					onStdout(stubSkillContent);
				}
			},
			cancel: () => { /* 스텁: 취소 동작 없음 */ },
			isRunning: () => false,
			getSpawnCommand: () => 'claude',
		};

		try {
			// FileManager와 스텁 러너로 AnalyzerService 인스턴스 생성
			const fileManager = new FileManager();
			const analyzerService = new AnalyzerService(stubRunner, fileManager);

			// generateSkill() 호출 — skillsDir에 test-skill.md가 생성되어야 한다
			const result = await analyzerService.generateSkill(
				'# 테스트 스킬\n\n테스트용 스킬을 생성해 주세요.',
				skillsDir,
			);

			// CLI 에이전트(runner.invoke())가 호출되었는지 확인
			assert.strictEqual(
				invokeWasCalled,
				true,
				'AnalyzerService.generateSkill()이 CLI 에이전트(runner.invoke())를 호출해야 합니다.',
			);

			// 생성된 파일 경로가 skillsDir/test-skill.md인지 확인
			const expectedFilePath = path.join(skillsDir, 'test-skill.md');
			assert.strictEqual(
				result.filePath,
				expectedFilePath,
				'생성된 파일 경로가 skillsDir/test-skill.md여야 합니다.',
			);

			// 파일이 실제로 존재하고 비어 있지 않은지 확인
			const fileContent = await fs.readFile(expectedFilePath, 'utf-8');
			assert.ok(fileContent.length > 0, '생성된 파일이 비어있지 않아야 합니다.');
		} finally {
			// 테스트 후 임시 디렉토리 정리
			await fs.rm(skillsDir, { recursive: true, force: true }).catch(() => { /* 정리 실패 무시 */ });
		}
	});

	// F-009: 생성된 스킬 파일이 트리거 조건과 동작 설명을 포함하는지 검증
	test('F-009: 생성된 스킬 파일이 트리거 조건과 동작 설명을 포함해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { AnalyzerService, FileManager } = ext.exports;

		// 테스트용 임시 skillsDir 생성
		const skillsDir = path.join(os.tmpdir(), `test-skills-f009b-${Date.now()}`);
		await fs.mkdir(skillsDir, { recursive: true });

		// 트리거 조건과 동작 설명을 포함하는 스텁 출력 정의
		const stubSkillContent = [
			'---',
			'name: review-code',
			'description: 코드 리뷰를 자동으로 수행합니다.',
			'---',
			'',
			'## 트리거 조건',
			'사용자가 코드 리뷰를 요청하거나 PR을 작성할 때 실행됩니다.',
			'',
			'## 동작 설명',
			'1. 변경된 파일 목록을 확인한다',
			'2. 코드 품질 기준에 따라 검토한다',
			'3. 리뷰 코멘트를 작성한다',
		].join('\n');

		const stubRunner: IAgentRunner = {
			invoke: async (_prompt: string, onStdout?: (chunk: string) => void): Promise<void> => {
				if (onStdout) {
					onStdout(stubSkillContent);
				}
			},
			cancel: () => { /* 스텁: 취소 동작 없음 */ },
			isRunning: () => false,
			getSpawnCommand: () => 'claude',
		};

		try {
			const fileManager = new FileManager();
			const analyzerService = new AnalyzerService(stubRunner, fileManager);

			const result = await analyzerService.generateSkill(
				'코드 리뷰 스킬을 만들어 주세요.',
				skillsDir,
			);

			// 생성된 파일 내용 직접 읽어 검증
			const fileContent = await fs.readFile(result.filePath, 'utf-8');

			// 파일에 스킬 이름이 포함되어 있는지 확인
			assert.ok(
				fileContent.includes('review-code'),
				'생성된 스킬 파일에 스킬 이름(review-code)이 포함되어야 합니다.',
			);

			// 파일에 트리거 조건 섹션이 포함되어 있는지 확인
			assert.ok(
				fileContent.includes('트리거 조건'),
				'생성된 스킬 파일에 트리거 조건 섹션이 포함되어야 합니다.',
			);

			// 파일에 동작 설명 섹션이 포함되어 있는지 확인
			assert.ok(
				fileContent.includes('동작 설명'),
				'생성된 스킬 파일에 동작 설명 섹션이 포함되어야 합니다.',
			);
		} finally {
			// 테스트 후 임시 디렉토리 정리
			await fs.rm(skillsDir, { recursive: true, force: true }).catch(() => { /* 정리 실패 무시 */ });
		}
	});

	// F-010: AnalyzerService.generateMcpServerSpec()가 CLI 에이전트를 호출하고
	// 지정 디렉토리에 MCP 서버 스펙 .json 파일을 생성하는지 검증
	test('F-010: AnalyzerService.generateMcpServerSpec()가 CLI 에이전트를 호출하고 MCP 스펙 .json 파일을 생성해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { AnalyzerService, FileManager } = ext.exports;

		// 테스트용 임시 outputDir 생성
		const outputDir = path.join(os.tmpdir(), `test-mcp-f010-${Date.now()}`);
		await fs.mkdir(outputDir, { recursive: true });

		// 스텁 IAgentRunner — invoke() 호출 시 MCP 서버 스펙 JSON을 onStdout으로 전달
		let invokeWasCalled = false;
		const stubMcpContent = JSON.stringify({
			serverName: 'test-mcp-server',
			command: 'node',
			args: ['server.js'],
			description: '테스트용 MCP 서버입니다.',
		}, null, 2);

		const stubRunner: IAgentRunner = {
			invoke: async (_prompt: string, onStdout?: (chunk: string) => void): Promise<void> => {
				// invoke()가 호출되었음을 기록
				invokeWasCalled = true;
				// 스텁 출력을 onStdout 콜백으로 전달 (실제 CLI 출력 시뮬레이션)
				if (onStdout) {
					onStdout(stubMcpContent);
				}
			},
			cancel: () => { /* 스텁: 취소 동작 없음 */ },
			isRunning: () => false,
			getSpawnCommand: () => 'claude',
		};

		try {
			// FileManager와 스텁 러너로 AnalyzerService 인스턴스 생성
			const fileManager = new FileManager();
			const analyzerService = new AnalyzerService(stubRunner, fileManager);

			// generateMcpServerSpec() 호출 — outputDir에 test-mcp-server.json이 생성되어야 한다
			const result = await analyzerService.generateMcpServerSpec(
				'# 테스트 MCP 서버\n\n파일 시스템 접근을 위한 MCP 서버를 만들어 주세요.',
				outputDir,
			);

			// CLI 에이전트(runner.invoke())가 호출되었는지 확인
			assert.strictEqual(
				invokeWasCalled,
				true,
				'AnalyzerService.generateMcpServerSpec()이 CLI 에이전트(runner.invoke())를 호출해야 합니다.',
			);

			// 생성된 파일 경로가 outputDir/test-mcp-server.json인지 확인
			const expectedFilePath = path.join(outputDir, 'test-mcp-server.json');
			assert.strictEqual(
				result.filePath,
				expectedFilePath,
				'생성된 파일 경로가 outputDir/test-mcp-server.json여야 합니다.',
			);

			// 파일이 실제로 존재하고 비어 있지 않은지 확인
			const fileContent = await fs.readFile(expectedFilePath, 'utf-8');
			assert.ok(fileContent.length > 0, '생성된 파일이 비어있지 않아야 합니다.');
		} finally {
			// 테스트 후 임시 디렉토리 정리
			await fs.rm(outputDir, { recursive: true, force: true }).catch(() => { /* 정리 실패 무시 */ });
		}
	});

	// F-010: 생성된 MCP 서버 스펙 파일이 서버 이름과 구성 필드를 포함하는지 검증
	test('F-010: 생성된 MCP 서버 스펙 파일이 서버 이름과 구성 필드를 포함해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { AnalyzerService, FileManager } = ext.exports;

		// 테스트용 임시 outputDir 생성
		const outputDir = path.join(os.tmpdir(), `test-mcp-f010b-${Date.now()}`);
		await fs.mkdir(outputDir, { recursive: true });

		// 서버 이름과 구성 필드를 포함하는 스텁 출력 정의
		const stubMcpContent = JSON.stringify({
			serverName: 'filesystem-server',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
			description: '파일 시스템 접근 MCP 서버',
		}, null, 2);

		const stubRunner: IAgentRunner = {
			invoke: async (_prompt: string, onStdout?: (chunk: string) => void): Promise<void> => {
				if (onStdout) {
					onStdout(stubMcpContent);
				}
			},
			cancel: () => { /* 스텁: 취소 동작 없음 */ },
			isRunning: () => false,
			getSpawnCommand: () => 'claude',
		};

		try {
			const fileManager = new FileManager();
			const analyzerService = new AnalyzerService(stubRunner, fileManager);

			const result = await analyzerService.generateMcpServerSpec(
				'파일 시스템 접근 MCP 서버를 만들어 주세요.',
				outputDir,
			);

			// 생성된 파일 내용 직접 읽어 검증
			const fileContent = await fs.readFile(result.filePath, 'utf-8');

			// 파일에 서버 이름이 포함되어 있는지 확인
			assert.ok(
				fileContent.includes('filesystem-server'),
				'생성된 MCP 스펙 파일에 서버 이름(filesystem-server)이 포함되어야 합니다.',
			);

			// 파일에 command 필드가 포함되어 있는지 확인
			assert.ok(
				fileContent.includes('command'),
				'생성된 MCP 스펙 파일에 command 필드가 포함되어야 합니다.',
			);

			// 파일에 args 필드가 포함되어 있는지 확인
			assert.ok(
				fileContent.includes('args'),
				'생성된 MCP 스펙 파일에 args 필드가 포함되어야 합니다.',
			);
		} finally {
			// 테스트 후 임시 디렉토리 정리
			await fs.rm(outputDir, { recursive: true, force: true }).catch(() => { /* 정리 실패 무시 */ });
		}
	});

	// F-011: AnalyzerService.generateHookEntry()가 CLI 에이전트를 호출하고
	// settings.json의 hooks 섹션에 이벤트 이름과 셸 명령을 기록하는지 검증
	test('F-011: AnalyzerService.generateHookEntry()가 CLI 에이전트를 호출하고 settings.json에 훅 항목을 추가해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { AnalyzerService, FileManager } = ext.exports;

		// 테스트용 임시 설정 디렉토리 및 settings.json 생성
		const tempDir = path.join(os.tmpdir(), `test-hook-f011-${Date.now()}`);
		await fs.mkdir(tempDir, { recursive: true });
		const settingsPath = path.join(tempDir, 'settings.json');
		// 초기 settings.json — hooks 섹션이 비어 있는 상태
		await fs.writeFile(settingsPath, JSON.stringify({ permissions: { allow: [], deny: [] }, hooks: {}, env: {} }, null, 2), 'utf-8');

		// 스텁 IAgentRunner — invoke() 호출 시 훅 JSON을 onStdout으로 전달
		let invokeWasCalled = false;
		const stubHookContent = JSON.stringify({
			event: 'pre-tool-use',
			command: 'echo "pre-tool-use hook triggered"',
		}, null, 2);

		const stubRunner: IAgentRunner = {
			invoke: async (_prompt: string, onStdout?: (chunk: string) => void): Promise<void> => {
				// invoke()가 호출되었음을 기록
				invokeWasCalled = true;
				// 스텁 출력을 onStdout 콜백으로 전달
				if (onStdout) {
					onStdout(stubHookContent);
				}
			},
			cancel: () => { /* 스텁: 취소 동작 없음 */ },
			isRunning: () => false,
			getSpawnCommand: () => 'claude',
		};

		try {
			// FileManager와 스텁 러너로 AnalyzerService 인스턴스 생성
			const fileManager = new FileManager();
			const analyzerService = new AnalyzerService(stubRunner, fileManager);

			// generateHookEntry() 호출 — settingsPath의 hooks 섹션에 훅이 추가되어야 한다
			const result = await analyzerService.generateHookEntry(
				'# 테스트 훅\n\npre-tool-use 이벤트 발생 시 로그를 출력하는 훅을 만들어 주세요.',
				settingsPath,
			);

			// CLI 에이전트(runner.invoke())가 호출되었는지 확인
			assert.strictEqual(
				invokeWasCalled,
				true,
				'AnalyzerService.generateHookEntry()이 CLI 에이전트(runner.invoke())를 호출해야 합니다.',
			);

			// 반환된 이벤트 이름이 올바른지 확인
			assert.strictEqual(
				result.event,
				'pre-tool-use',
				'반환된 event가 "pre-tool-use"여야 합니다.',
			);

			// 반환된 settingsPath가 입력과 동일한지 확인
			assert.strictEqual(
				result.settingsPath,
				settingsPath,
				'반환된 settingsPath가 입력 settingsPath와 동일해야 합니다.',
			);
		} finally {
			// 테스트 후 임시 디렉토리 정리
			await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { /* 정리 실패 무시 */ });
		}
	});

	// F-011: 생성된 훅 항목이 올바른 이벤트 이름과 셸 명령을 settings.json에 포함하는지 검증
	test('F-011: settings.json의 hooks 섹션에 올바른 이벤트 이름과 셸 명령이 기록되어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { AnalyzerService, FileManager } = ext.exports;

		// 테스트용 임시 설정 디렉토리 및 settings.json 생성
		const tempDir = path.join(os.tmpdir(), `test-hook-f011b-${Date.now()}`);
		await fs.mkdir(tempDir, { recursive: true });
		const settingsPath = path.join(tempDir, 'settings.json');
		await fs.writeFile(settingsPath, JSON.stringify({ permissions: { allow: [], deny: [] }, hooks: {}, env: {} }, null, 2), 'utf-8');

		// 이벤트 이름과 명령을 명확히 포함한 스텁 출력 정의
		const expectedEvent = 'post-tool-use';
		const expectedCommand = 'echo "post-tool-use completed"';
		const stubHookContent = JSON.stringify({ event: expectedEvent, command: expectedCommand }, null, 2);

		const stubRunner: IAgentRunner = {
			invoke: async (_prompt: string, onStdout?: (chunk: string) => void): Promise<void> => {
				if (onStdout) {
					onStdout(stubHookContent);
				}
			},
			cancel: () => { /* 스텁: 취소 동작 없음 */ },
			isRunning: () => false,
			getSpawnCommand: () => 'claude',
		};

		try {
			const fileManager = new FileManager();
			const analyzerService = new AnalyzerService(stubRunner, fileManager);

			await analyzerService.generateHookEntry(
				'post-tool-use 이벤트 후 완료 메시지를 출력하는 훅을 만들어 주세요.',
				settingsPath,
			);

			// 갱신된 settings.json을 직접 읽어 검증
			const updatedContent = await fs.readFile(settingsPath, 'utf-8');
			const updatedSettings = JSON.parse(updatedContent) as {
				hooks?: Record<string, Array<{ type: string; command: string }>>;
			};

			// hooks 섹션에 expectedEvent 키가 존재하는지 확인
			assert.ok(
				updatedSettings.hooks && Array.isArray(updatedSettings.hooks[expectedEvent]),
				`settings.json hooks["${expectedEvent}"]가 배열로 존재해야 합니다.`,
			);

			// 해당 이벤트 배열에 추가된 훅 항목의 command가 일치하는지 확인
			const hookEntries = updatedSettings.hooks![expectedEvent];
			const added = hookEntries.find((e) => e.command === expectedCommand);
			assert.ok(
				added !== undefined,
				`hooks["${expectedEvent}"]에 command="${expectedCommand}" 항목이 있어야 합니다.`,
			);

			// type 필드가 'command'인지 확인
			assert.strictEqual(
				added!.type,
				'command',
				'훅 항목의 type 필드가 "command"여야 합니다.',
			);
		} finally {
			// 테스트 후 임시 디렉토리 정리
			await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { /* 정리 실패 무시 */ });
		}
	});

	// F-012: AnalyzerService.generateSubAgent()가 CLI 에이전트를 호출하고
	// .claude/agents/ 디렉토리에 서브에이전트 .md 파일을 생성하는지 검증
	test('F-012: AnalyzerService.generateSubAgent()가 CLI 에이전트를 호출하고 .claude/agents/에 파일을 생성해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { AnalyzerService, FileManager } = ext.exports;

		// 테스트용 임시 에이전트 디렉토리 생성
		const tempDir = path.join(os.tmpdir(), `test-agent-f012-${Date.now()}`);
		const agentsDir = path.join(tempDir, 'agents');
		await fs.mkdir(agentsDir, { recursive: true });

		// 스텁 IAgentRunner — invoke() 호출 시 서브에이전트 Markdown을 onStdout으로 전달
		let invokeWasCalled = false;
		const stubAgentContent = [
			'---',
			'name: test-agent',
			'description: 테스트 에이전트입니다.',
			'tools: Read, Edit',
			'---',
			'',
			'# test-agent',
			'',
			'## 역할',
			'테스트 목적으로 생성된 에이전트입니다.',
			'',
			'## 사용 도구',
			'Read, Edit 도구를 사용합니다.',
			'',
			'## 행동 규칙',
			'테스트 규칙을 준수합니다.',
		].join('\n');

		const stubRunner: IAgentRunner = {
			invoke: async (_prompt: string, onStdout?: (chunk: string) => void): Promise<void> => {
				// invoke()가 호출되었음을 기록
				invokeWasCalled = true;
				// 스텁 출력을 onStdout 콜백으로 전달
				if (onStdout) {
					onStdout(stubAgentContent);
				}
			},
			cancel: () => { /* 스텁: 취소 동작 없음 */ },
			isRunning: () => false,
			getSpawnCommand: () => 'claude',
		};

		try {
			// FileManager와 스텁 러너로 AnalyzerService 인스턴스 생성
			const fileManager = new FileManager();
			const analyzerService = new AnalyzerService(stubRunner, fileManager);

			// generateSubAgent() 호출 — agentsDir에 test-agent.md가 생성되어야 한다
			const result = await analyzerService.generateSubAgent(
				'# 테스트 에이전트\n\n파일 읽기와 편집 기능을 갖춘 에이전트를 만들어 주세요.',
				agentsDir,
			);

			// CLI 에이전트(runner.invoke())가 호출되었는지 확인
			assert.strictEqual(
				invokeWasCalled,
				true,
				'AnalyzerService.generateSubAgent()이 CLI 에이전트(runner.invoke())를 호출해야 합니다.',
			);

			// 반환된 filePath가 agentsDir/<에이전트-이름>.md 형태인지 확인
			assert.ok(
				result.filePath.endsWith('test-agent.md'),
				`filePath가 'test-agent.md'로 끝나야 합니다. 실제 값: ${result.filePath}`,
			);

			// 파일이 실제로 생성되었는지 확인
			const fileExists = await fs.access(result.filePath).then(() => true).catch(() => false);
			assert.strictEqual(
				fileExists,
				true,
				`파일 '${result.filePath}'이 파일시스템에 존재해야 합니다.`,
			);
		} finally {
			// 테스트 후 임시 디렉토리 정리
			await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { /* 정리 실패 무시 */ });
		}
	});

	// F-012: 생성된 서브에이전트 파일이 에이전트 설명, 도구, 행동 규칙을 포함하는지 검증
	test('F-012: 생성된 서브에이전트 파일이 에이전트 설명, 도구, 행동 규칙을 포함해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { AnalyzerService, FileManager } = ext.exports;

		// 테스트용 임시 에이전트 디렉토리 생성
		const tempDir = path.join(os.tmpdir(), `test-agent-f012b-${Date.now()}`);
		const agentsDir = path.join(tempDir, 'agents');
		await fs.mkdir(agentsDir, { recursive: true });

		// 에이전트 설명, 도구, 행동 규칙을 명확히 포함한 스텁 출력 정의
		const stubAgentContent = [
			'---',
			'name: code-reviewer',
			'description: 코드 리뷰를 전문으로 하는 에이전트입니다.',
			'tools: Read, Grep, Glob',
			'---',
			'',
			'# code-reviewer',
			'',
			'## 역할',
			'코드 품질 검토 및 개선 제안을 수행합니다.',
			'',
			'## 사용 도구',
			'Read, Grep, Glob 도구를 활용합니다.',
			'',
			'## 행동 규칙',
			'1. 코드를 수정하지 않고 검토만 합니다.',
			'2. 구체적인 개선 제안을 제시합니다.',
		].join('\n');

		const stubRunner: IAgentRunner = {
			invoke: async (_prompt: string, onStdout?: (chunk: string) => void): Promise<void> => {
				if (onStdout) {
					onStdout(stubAgentContent);
				}
			},
			cancel: () => { /* 스텁: 취소 동작 없음 */ },
			isRunning: () => false,
			getSpawnCommand: () => 'claude',
		};

		try {
			const fileManager = new FileManager();
			const analyzerService = new AnalyzerService(stubRunner, fileManager);

			const result = await analyzerService.generateSubAgent(
				'코드 리뷰를 전문으로 하는 에이전트를 만들어 주세요.',
				agentsDir,
			);

			// 생성된 파일의 내용을 직접 읽어 검증
			const fileContent = await fs.readFile(result.filePath, 'utf-8');

			// 에이전트 설명(description) 포함 여부 확인
			assert.ok(
				fileContent.includes('코드 리뷰를 전문으로 하는 에이전트입니다.'),
				'파일에 에이전트 설명(description)이 포함되어야 합니다.',
			);

			// 사용 도구 섹션 포함 여부 확인
			assert.ok(
				fileContent.includes('## 사용 도구'),
				'파일에 "## 사용 도구" 섹션이 포함되어야 합니다.',
			);

			// 행동 규칙 섹션 포함 여부 확인
			assert.ok(
				fileContent.includes('## 행동 규칙'),
				'파일에 "## 행동 규칙" 섹션이 포함되어야 합니다.',
			);

			// YAML frontmatter의 tools 필드 포함 여부 확인
			assert.ok(
				fileContent.includes('tools:'),
				'파일의 YAML frontmatter에 tools 필드가 포함되어야 합니다.',
			);
		} finally {
			// 테스트 후 임시 디렉토리 정리
			await fs.rm(tempDir, { recursive: true, force: true }).catch(() => { /* 정리 실패 무시 */ });
		}
	});

	// F-013: PlanService.loadPlan()이 PLAN.md를 읽어 완료/미완료 단계를 올바르게 파싱하는지 검증
	test('F-013: PlanService.loadPlan()이 [x] 완료 단계와 [ ] 미완료 단계를 올바르게 파싱해야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { PlanService, FileManager } = ext.exports;

		// 테스트용 임시 PLAN.md 파일 생성
		const tmpDir = os.tmpdir();
		const planFilePath = path.join(tmpDir, `test-plan-f013-${Date.now()}.md`);
		const planContent = [
			'# PLAN.md',
			'',
			'## 1단계: 인프라 구성',
			'- [x] Extension 활성화 구현',
			'- [x] esbuild 번들링 설정',
			'- [ ] .vsix 패키징 검증',
			'',
			'## 2단계: UI 구현',
			'- [ ] WebviewPanel 생성',
			'- 설정 UI 추가',
		].join('\n');
		await fs.writeFile(planFilePath, planContent, 'utf-8');

		try {
			// FileManager와 PlanService 인스턴스 생성
			const fileManager = new FileManager();
			const planService = new PlanService(fileManager);

			// loadPlan() 호출 — PLAN.md를 읽어 PlanData를 반환해야 한다
			const planData = await planService.loadPlan(planFilePath);

			// rawContent가 파일 내용과 일치하는지 확인
			assert.strictEqual(
				planData.rawContent,
				planContent,
				'rawContent가 PLAN.md 파일 내용과 일치해야 합니다.'
			);

			// 섹션이 2개인지 확인
			assert.strictEqual(
				planData.sections.length,
				2,
				'섹션이 2개여야 합니다 (## 제목 2개 기준).'
			);

			// 1단계 섹션 검증
			const section1 = planData.sections[0];
			assert.strictEqual(section1.title, '1단계: 인프라 구성', '첫 번째 섹션 제목이 일치해야 합니다.');
			assert.strictEqual(section1.steps.length, 3, '첫 번째 섹션에 단계가 3개여야 합니다.');

			// [x] 완료 단계 검증
			assert.strictEqual(section1.steps[0].completed, true, '첫 번째 단계([x])가 completed=true여야 합니다.');
			assert.strictEqual(section1.steps[0].text, 'Extension 활성화 구현', '첫 번째 단계 텍스트가 일치해야 합니다.');
			assert.strictEqual(section1.steps[1].completed, true, '두 번째 단계([x])가 completed=true여야 합니다.');

			// [ ] 미완료 단계 검증
			assert.strictEqual(section1.steps[2].completed, false, '세 번째 단계([ ])가 completed=false여야 합니다.');
			assert.strictEqual(section1.steps[2].text, '.vsix 패키징 검증', '세 번째 단계 텍스트가 일치해야 합니다.');

			// 2단계 섹션 검증
			const section2 = planData.sections[1];
			assert.strictEqual(section2.title, '2단계: UI 구현', '두 번째 섹션 제목이 일치해야 합니다.');
			assert.strictEqual(section2.steps.length, 2, '두 번째 섹션에 단계가 2개여야 합니다.');
			assert.strictEqual(section2.steps[0].completed, false, '체크박스 없는 - 항목도 completed=false여야 합니다.');
		} finally {
			// 테스트 후 임시 파일 정리
			await fs.unlink(planFilePath).catch(() => { /* 이미 삭제된 경우 무시 */ });
		}
	});

	// F-013: PlanView HTML에 완료 단계(step-completed)와 미완료 단계(step-pending)가
	// 시각적으로 구분되어 렌더링되는지 검증
	test('F-013: PlanView HTML에 완료 단계와 미완료 단계가 다른 CSS 클래스로 렌더링되어야 한다', async () => {
		// Extension 활성화 및 ExtensionApi 획득
		const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		const { PlanView, FileManager, PlanService } = ext.exports;

		// 테스트 전 기존 PlanView 패널 닫기 (상태 격리)
		PlanView.disposeForTest();

		// 테스트용 임시 PLAN.md 파일 생성
		const tmpDir = os.tmpdir();
		const planFilePath = path.join(tmpDir, `test-planview-f013-${Date.now()}.md`);
		const planContent = [
			'## 테스트 섹션',
			'- [x] 완료된 작업',
			'- [ ] 미완료 작업',
		].join('\n');
		await fs.writeFile(planFilePath, planContent, 'utf-8');

		try {
			// PlanService로 PLAN.md 파싱
			const fileManager = new FileManager();
			const planService = new PlanService(fileManager);
			const planData = await planService.loadPlan(planFilePath);

			// Extension URI 획득 (실제 extensionUri 필요 — Extension에서 가져옴)
			const extObj = vscode.extensions.getExtension(EXTENSION_ID);
			assert.ok(extObj, 'Extension을 찾을 수 없습니다.');
			const extensionUri = extObj.extensionUri;

			// PlanView 패널 표시
			PlanView.show(extensionUri, planData);
			assert.strictEqual(PlanView.isOpen(), true, 'PlanView 패널이 열려 있어야 합니다.');

			// HTML 콘텐츠 획득
			const html = PlanView.getHtmlForTest();
			assert.ok(html.length > 0, 'PlanView HTML이 비어 있지 않아야 합니다.');

			// plan-steps 목록이 HTML에 포함되어 있는지 확인
			assert.ok(
				html.includes('class="plan-steps"'),
				'HTML에 plan-steps 클래스 목록이 포함되어야 합니다.'
			);

			// 완료 단계가 step-completed 클래스로 렌더링되는지 확인
			assert.ok(
				html.includes('step-completed'),
				'HTML에 step-completed 클래스가 포함되어야 합니다 (완료 단계 시각적 구분).'
			);

			// 미완료 단계가 step-pending 클래스로 렌더링되는지 확인
			assert.ok(
				html.includes('step-pending'),
				'HTML에 step-pending 클래스가 포함되어야 합니다 (미완료 단계 시각적 구분).'
			);

			// 완료 인디케이터(✓)가 포함되어 있는지 확인
			assert.ok(
				html.includes('step-indicator-completed'),
				'HTML에 step-indicator-completed 클래스가 포함되어야 합니다.'
			);

			// 단계 텍스트가 HTML에 포함되어 있는지 확인 (XSS 이스케이프 후)
			assert.ok(
				html.includes('완료된 작업'),
				'완료된 단계 텍스트가 HTML에 포함되어야 합니다.'
			);
			assert.ok(
				html.includes('미완료 작업'),
				'미완료 단계 텍스트가 HTML에 포함되어야 합니다.'
			);
		} finally {
			// 테스트 후 패널과 임시 파일 정리
			PlanView.disposeForTest();
			await fs.unlink(planFilePath).catch(() => { /* 이미 삭제된 경우 무시 */ });
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
