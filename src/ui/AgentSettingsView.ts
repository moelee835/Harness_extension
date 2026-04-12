// VSCode Extension API 가져오기
import * as vscode from 'vscode';
// AgentConfig — 에이전트 설정 읽기/쓰기
import { AgentConfig, AgentType } from '../config/AgentConfig.js';

/**
 * 웹뷰에서 Extension으로 전달되는 에이전트 타입 변경 메시지.
 * 사용자가 드롭다운에서 에이전트 타입을 선택하면 웹뷰 스크립트가 이 형식으로 postMessage를 호출한다.
 */
export interface AgentSettingsTypeMessage {
	/** 메시지 종류 식별자 */
	type: 'setAgentType';
	/** 선택된 에이전트 타입 */
	value: AgentType;
}

/**
 * 웹뷰에서 Extension으로 전달되는 CLI 경로 변경 메시지.
 * 사용자가 CLI 경로 입력 필드를 수정하면 웹뷰 스크립트가 이 형식으로 postMessage를 호출한다.
 */
export interface AgentSettingsCliPathMessage {
	/** 메시지 종류 식별자 */
	type: 'setCliPath';
	/** 입력된 CLI 실행 파일 경로 */
	value: string;
}

/**
 * 웹뷰에서 Extension으로 전달되는 추가 CLI 플래그 변경 메시지.
 * 사용자가 추가 플래그 입력 필드를 수정하면 웹뷰 스크립트가 이 형식으로 postMessage를 호출한다.
 */
export interface AgentSettingsExtraArgsMessage {
	/** 메시지 종류 식별자 */
	type: 'setExtraArgs';
	/** 입력된 추가 CLI 플래그 문자열 (예: '--verbose --model claude-opus-4-6') */
	value: string;
}

/**
 * 웹뷰에서 Extension으로 전달되는 에이전트 설정 메시지의 유니온 타입.
 * setAgentType, setCliPath, setExtraArgs 메시지 중 하나이다.
 */
export type AgentSettingsMessage =
	| AgentSettingsTypeMessage
	| AgentSettingsCliPathMessage
	| AgentSettingsExtraArgsMessage;

/**
 * Extension에서 웹뷰로 전달되는 초기 설정 메시지 타입 정의.
 * 패널 생성 시 현재 저장된 설정값을 웹뷰로 전송하여 UI에 반영한다.
 */
export interface AgentSettingsInitMessage {
	/** 메시지 종류 식별자 */
	type: 'settingsLoaded';
	/** 현재 저장된 에이전트 타입 */
	agentType: AgentType;
}

/**
 * 에이전트 설정 WebviewPanel을 관리하는 클래스.
 * F-014: 에이전트 타입 선택 UI(드롭다운)를 제공하고, 선택값을 AgentConfig에 저장한다.
 *
 * 싱글톤 패턴을 사용하여 동시에 하나의 설정 패널만 열리도록 보장한다.
 */
export class AgentSettingsView {
	/** WebviewPanel 뷰 타입 식별자 — VSCode가 패널을 식별하는 데 사용하는 고유 키 */
	public static readonly VIEW_TYPE = 'agentHarnessSettings';

	/** 현재 열려 있는 패널 인스턴스 (없으면 undefined) */
	private static currentPanel: AgentSettingsView | undefined;

	/** VSCode WebviewPanel 인스턴스 */
	private readonly panel: vscode.WebviewPanel;

	/** Extension 컨텍스트 — 리소스 경로 접근 등에 사용 */
	private readonly extensionUri: vscode.Uri;

	/** 패널 라이프사이클 관리용 disposable 목록 */
	private readonly disposables: vscode.Disposable[] = [];

	/**
	 * 웹뷰에서 수신하여 AgentConfig에 저장한 최신 에이전트 타입.
	 * 초기값은 현재 설정된 AgentType으로 채워진다.
	 */
	private _agentType: AgentType;

	/**
	 * 웹뷰에서 수신하여 AgentConfig에 저장한 최신 CLI 실행 경로.
	 * 초기값은 현재 설정된 cliPath로 채워진다.
	 */
	private _cliPath: string;

	/**
	 * 웹뷰에서 수신하여 AgentConfig에 저장한 최신 추가 CLI 플래그 문자열.
	 * 초기값은 현재 설정된 extraArgs로 채워진다.
	 */
	private _extraArgs: string;

	/**
	 * AgentSettingsView 생성자 — 외부에서 직접 호출하지 말 것.
	 * 패널 생성은 반드시 `AgentSettingsView.show()` 정적 메서드를 통해 수행한다.
	 *
	 * @param panel - VSCode가 생성한 WebviewPanel 인스턴스
	 * @param extensionUri - Extension 루트 디렉토리 URI
	 */
	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this.panel = panel;
		this.extensionUri = extensionUri;
		// 현재 저장된 에이전트 타입으로 초기화
		this._agentType = AgentConfig.getAgentType();
		// 현재 저장된 CLI 경로로 초기화
		this._cliPath = AgentConfig.getCliPath();
		// 현재 저장된 추가 CLI 플래그로 초기화
		this._extraArgs = AgentConfig.getExtraArgs();

		// Webview 내부 HTML 콘텐츠 렌더링
		this._update();

		// 패널이 닫힐 때 리소스 해제
		this.panel.onDidDispose(
			() => this.dispose(),
			null,
			this.disposables
		);

		// 패널 가시성 변경 시 콘텐츠 갱신
		this.panel.onDidChangeViewState(
			() => {
				if (this.panel.visible) {
					this._update();
				}
			},
			null,
			this.disposables
		);

		// 웹뷰에서 전달되는 메시지 수신 — F-014: 에이전트 타입 변경 이벤트 처리
		this.panel.webview.onDidReceiveMessage(
			(message: AgentSettingsMessage) => {
				this._processMessage(message);
			},
			null,
			this.disposables
		);
	}

	/**
	 * 현재 에이전트 설정 패널이 열려 있는지 여부를 반환한다.
	 * 테스트에서 싱글톤 동작을 검증하는 데 사용한다.
	 *
	 * @returns 패널이 열려 있으면 true, 닫혀 있으면 false
	 */
	public static isOpen(): boolean {
		return AgentSettingsView.currentPanel !== undefined;
	}

	/**
	 * 현재 저장된 에이전트 타입을 반환한다.
	 * F-014 테스트에서 메시지 수신 후 AgentConfig 저장 여부를 검증하는 데 사용한다.
	 *
	 * @returns 현재 에이전트 타입 (패널이 없으면 AgentConfig.getAgentType() 값)
	 */
	public static getAgentType(): AgentType {
		return AgentSettingsView.currentPanel?._agentType ?? AgentConfig.getAgentType();
	}

	/**
	 * 현재 저장된 CLI 실행 경로를 반환한다.
	 * F-015 테스트에서 메시지 수신 후 AgentConfig 저장 여부를 검증하는 데 사용한다.
	 *
	 * @returns 현재 CLI 경로 (패널이 없으면 AgentConfig.getCliPath() 값)
	 */
	public static getCliPath(): string {
		return AgentSettingsView.currentPanel?._cliPath ?? AgentConfig.getCliPath();
	}

	/**
	 * 현재 저장된 추가 CLI 플래그 문자열을 반환한다.
	 * F-016 테스트에서 메시지 수신 후 AgentConfig 저장 여부를 검증하는 데 사용한다.
	 *
	 * @returns 현재 추가 CLI 플래그 (패널이 없으면 AgentConfig.getExtraArgs() 값)
	 */
	public static getExtraArgs(): string {
		return AgentSettingsView.currentPanel?._extraArgs ?? AgentConfig.getExtraArgs();
	}

	/**
	 * 테스트 환경에서 웹뷰 메시지 수신을 시뮬레이션한다.
	 * 실제 웹뷰 샌드박스 환경에서는 직접 메시지를 주입할 수 없으므로,
	 * 메시지 처리 로직을 검증하기 위해 테스트 코드에서만 호출한다.
	 *
	 * @param message - 시뮬레이션할 AgentSettingsMessage 객체
	 */
	public static simulateWebviewMessage(message: AgentSettingsMessage): void {
		if (AgentSettingsView.currentPanel) {
			AgentSettingsView.currentPanel._processMessage(message);
		}
	}

	/**
	 * 현재 패널의 웹뷰 HTML 콘텐츠를 반환한다.
	 * 테스트에서 HTML에 필요한 에이전트 타입 선택 UI가 포함되어 있는지 검증하는 데 사용한다.
	 *
	 * @returns 현재 웹뷰 HTML 문자열 (패널이 없으면 빈 문자열)
	 */
	public static getHtmlForTest(): string {
		return AgentSettingsView.currentPanel?.panel.webview.html ?? '';
	}

	/**
	 * 에이전트 설정 패널을 열거나 이미 열려 있으면 포커스를 이동한다.
	 *
	 * @param extensionUri - Extension 루트 디렉토리 URI
	 */
	public static show(extensionUri: vscode.Uri): void {
		// 현재 활성 편집기 그룹 오른쪽 열에 패널 표시
		const column = vscode.window.activeTextEditor
			? vscode.ViewColumn.Beside
			: vscode.ViewColumn.One;

		// 이미 열린 패널이 존재하면 포커스만 이동하고 반환
		if (AgentSettingsView.currentPanel) {
			AgentSettingsView.currentPanel.panel.reveal(column);
			return;
		}

		// 새 WebviewPanel 생성
		const panel = vscode.window.createWebviewPanel(
			AgentSettingsView.VIEW_TYPE,
			'Agent Harness: 에이전트 설정',  // 패널 탭 제목
			column,
			{
				// JavaScript 실행 허용 — 웹뷰 스크립트(postMessage)를 위해 필수
				enableScripts: true,
				// 패널이 숨겨져도 DOM 상태(선택값 포함) 유지
				retainContextWhenHidden: true,
			}
		);

		// 새 인스턴스 생성 및 싱글톤 등록
		AgentSettingsView.currentPanel = new AgentSettingsView(panel, extensionUri);
	}

	/**
	 * 웹뷰에서 수신한 메시지를 처리한다.
	 * setAgentType 메시지: AgentConfig에 에이전트 타입을 저장하고 내부 상태를 갱신한다.
	 * setCliPath 메시지: AgentConfig에 CLI 경로를 저장하고 내부 상태를 갱신한다.
	 * setExtraArgs 메시지: AgentConfig에 추가 CLI 플래그를 저장하고 내부 상태를 갱신한다.
	 *
	 * @param message - 웹뷰에서 전달된 메시지 객체
	 */
	private _processMessage(message: AgentSettingsMessage): void {
		if (message.type === 'setAgentType') {
			// 내부 상태 갱신 — 즉시 접근 가능한 인메모리 값
			this._agentType = message.value;
			// VSCode 전역 설정에 비동기 저장 — 세션 간 영속성 보장(F-027)
			AgentConfig.setAgentType(message.value).catch((err: unknown) => {
				console.error('[AgentHarness] 에이전트 타입 저장 실패:', err);
			});
		} else if (message.type === 'setCliPath') {
			// 내부 상태 갱신 — 즉시 접근 가능한 인메모리 값
			this._cliPath = message.value;
			// VSCode 전역 설정에 비동기 저장 — 세션 간 영속성 보장(F-027)
			AgentConfig.setCliPath(message.value).catch((err: unknown) => {
				console.error('[AgentHarness] CLI 경로 저장 실패:', err);
			});
		} else if (message.type === 'setExtraArgs') {
			// 내부 상태 갱신 — 즉시 접근 가능한 인메모리 값
			this._extraArgs = message.value;
			// VSCode 전역 설정에 비동기 저장 — 세션 간 영속성 보장(F-027)
			AgentConfig.setExtraArgs(message.value).catch((err: unknown) => {
				console.error('[AgentHarness] 추가 CLI 플래그 저장 실패:', err);
			});
		}
	}

	/**
	 * Webview HTML 콘텐츠를 갱신한다.
	 * 현재 저장된 에이전트 타입을 선택 상태로 렌더링한다.
	 */
	private _update(): void {
		this.panel.webview.html = this._getHtmlContent();
	}

	/**
	 * Webview에 표시할 HTML 문자열을 반환한다.
	 * VSCode Webview 보안 정책에 따라 nonce 기반 CSP를 적용한다.
	 * F-014: 에이전트 타입 선택 드롭다운을 포함한다.
	 * F-015: CLI 실행 경로 입력 필드를 포함한다.
	 * F-016: 추가 CLI 플래그 입력 필드를 포함한다.
	 *
	 * @returns HTML 문자열
	 */
	private _getHtmlContent(): string {
		// 보안: 인라인 스크립트·스타일 허용을 위한 nonce 생성
		const nonce = this._getNonce();
		// 현재 저장된 에이전트 타입 — 선택된 option의 selected 속성에 사용
		const currentType = this._agentType;
		// 현재 저장된 CLI 경로 — 입력 필드의 초기값으로 사용 (XSS 방지를 위해 HTML 이스케이프)
		const currentCliPath = this._escapeHtml(this._cliPath);
		// 현재 저장된 추가 CLI 플래그 — textarea의 초기값으로 사용 (XSS 방지를 위해 HTML 이스케이프)
		const currentExtraArgs = this._escapeHtml(this._extraArgs);

		return /* html */`<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<!-- CSP: nonce가 일치하는 스크립트와 스타일만 허용 -->
	<meta http-equiv="Content-Security-Policy"
		content="default-src 'none';
				 style-src 'nonce-${nonce}';
				 script-src 'nonce-${nonce}';">
	<title>에이전트 설정</title>
	<style nonce="${nonce}">
		/* VSCode 테마 CSS 변수를 사용하여 다크/라이트 테마 자동 대응 */
		body {
			padding: 16px;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
		}

		h1 {
			font-size: 1.4em;
			font-weight: 600;
			margin-bottom: 16px;
			color: var(--vscode-editor-foreground);
		}

		/* 폼 그룹: 레이블과 입력 필드를 세로로 배치 */
		.form-group {
			display: flex;
			flex-direction: column;
			gap: 6px;
			margin-bottom: 16px;
		}

		label {
			font-weight: 600;
			color: var(--vscode-foreground);
		}

		/* 에이전트 타입 선택 드롭다운 — VSCode 드롭다운 테마 변수 적용 */
		#agent-type-select {
			padding: 4px 8px;
			background-color: var(--vscode-dropdown-background);
			color: var(--vscode-dropdown-foreground);
			border: 1px solid var(--vscode-dropdown-border);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			cursor: pointer;
		}

		#agent-type-select:focus {
			outline: 1px solid var(--vscode-focusBorder);
			border-color: var(--vscode-focusBorder);
		}

		/* CLI 경로 입력 필드 — VSCode 입력 테마 변수 적용 */
		#cli-path-input {
			padding: 4px 8px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border, transparent);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
		}

		#cli-path-input:focus {
			outline: 1px solid var(--vscode-focusBorder);
			border-color: var(--vscode-focusBorder);
		}

		/* 플레이스홀더 텍스트 색상 — VSCode 플레이스홀더 변수 적용 */
		#cli-path-input::placeholder {
			color: var(--vscode-input-placeholderForeground);
		}

		/* 추가 CLI 플래그 입력 textarea — VSCode 입력 테마 변수 적용 */
		#extra-args-input {
			padding: 4px 8px;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border, transparent);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			resize: vertical;
			min-height: 60px;
		}

		#extra-args-input:focus {
			outline: 1px solid var(--vscode-focusBorder);
			border-color: var(--vscode-focusBorder);
		}

		/* 플레이스홀더 텍스트 색상 */
		#extra-args-input::placeholder {
			color: var(--vscode-input-placeholderForeground);
		}
	</style>
</head>
<body>
	<h1>에이전트 설정</h1>

	<!-- F-014: 에이전트 타입 선택 폼 -->
	<div class="form-group">
		<label for="agent-type-select">CLI 에이전트 종류</label>
		<select id="agent-type-select">
			<option value="claude" ${currentType === 'claude' ? 'selected' : ''}>Claude Code</option>
			<option value="gemini" ${currentType === 'gemini' ? 'selected' : ''}>Gemini CLI</option>
			<option value="custom" ${currentType === 'custom' ? 'selected' : ''}>Custom CLI</option>
		</select>
	</div>

	<!-- F-015: CLI 실행 경로 입력 폼 -->
	<div class="form-group">
		<label for="cli-path-input">CLI 실행 경로</label>
		<input
			id="cli-path-input"
			type="text"
			value="${currentCliPath}"
			placeholder="예: /usr/local/bin/claude (비워두면 PATH에서 자동 탐색)"
		/>
	</div>

	<!-- F-016: 추가 CLI 플래그 입력 폼 -->
	<div class="form-group">
		<label for="extra-args-input">추가 CLI 플래그</label>
		<textarea
			id="extra-args-input"
			placeholder="예: --verbose --model claude-opus-4-6"
		>${currentExtraArgs}</textarea>
	</div>

	<script nonce="${nonce}">
		// VSCode Webview API 초기화 — postMessage, getState, setState 사용 가능
		const vscode = acquireVsCodeApi();
		const select = document.getElementById('agent-type-select');
		const cliPathInput = document.getElementById('cli-path-input');
		const extraArgsInput = document.getElementById('extra-args-input');

		// 드롭다운 변경 시 Extension으로 메시지 전송 — AgentConfig에 저장됨
		select.addEventListener('change', () => {
			vscode.postMessage({ type: 'setAgentType', value: select.value });
		});

		// CLI 경로 입력 변경 시 Extension으로 메시지 전송 — AgentConfig에 저장됨
		// input 이벤트: 키 입력 즉시 반응하여 실시간으로 저장
		cliPathInput.addEventListener('input', () => {
			vscode.postMessage({ type: 'setCliPath', value: cliPathInput.value });
		});

		// 추가 CLI 플래그 입력 변경 시 Extension으로 메시지 전송 — AgentConfig에 저장됨
		// input 이벤트: 키 입력 즉시 반응하여 실시간으로 저장
		extraArgsInput.addEventListener('input', () => {
			vscode.postMessage({ type: 'setExtraArgs', value: extraArgsInput.value });
		});
	</script>
</body>
</html>`;
	}

	/**
	 * HTML 특수 문자를 이스케이프하여 XSS 공격을 방지한다.
	 * 웹뷰 HTML 속성값(value="...")에 사용자 입력값을 삽입할 때 반드시 사용해야 한다.
	 *
	 * @param text - 이스케이프할 원본 문자열
	 * @returns HTML 특수 문자가 이스케이프된 안전한 문자열
	 */
	private _escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	/**
	 * CSP nonce로 사용할 무작위 문자열을 생성한다.
	 * 영문 대소문자와 숫자로 구성된 32자리 문자열을 반환한다.
	 *
	 * @returns 32자리 무작위 nonce 문자열
	 */
	private _getNonce(): string {
		let text = '';
		const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (let i = 0; i < 32; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	/**
	 * 패널과 연관된 모든 리소스를 해제한다.
	 * 패널이 닫히거나 Extension이 비활성화될 때 호출된다.
	 */
	public dispose(): void {
		// 싱글톤 참조 해제
		AgentSettingsView.currentPanel = undefined;

		// WebviewPanel 자체 해제
		this.panel.dispose();

		// 등록된 모든 disposable 해제
		while (this.disposables.length) {
			const disposable = this.disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
