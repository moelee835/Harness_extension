// VSCode Extension API 가져오기
import * as vscode from 'vscode';

/**
 * 웹뷰에서 Extension으로 전달되는 메시지 타입 정의.
 * 사용자가 입력 폼에 내용을 입력하면 웹뷰 스크립트가 이 형식으로 postMessage를 호출한다.
 */
export interface WebviewMessage {
	/** 메시지 종류 식별자 */
	type: 'inputChanged';
	/** 변경된 입력값 */
	value: string;
}

/**
 * Agent Harness Framework의 메인 WebviewPanel을 관리하는 클래스.
 * F-004: Extension의 기본 명령 실행 시 메인 패널을 여는 기능을 담당한다.
 * F-005: 프로젝트 요구사항 입력 폼을 제공하고, 입력값을 메시지로 수신하여 저장한다.
 *
 * 패널 뷰 타입(viewType)은 VSCode가 패널을 식별하는 데 사용하는 고유 키이므로
 * 변경 없이 일관되게 유지해야 한다.
 */
export class MainPanel {
	/** WebviewPanel 뷰 타입 식별자 — VSCode가 패널 직렬화/복원 시 사용 */
	public static readonly VIEW_TYPE = 'agentHarnessMain';

	/** 현재 열려 있는 패널 인스턴스 (없으면 undefined) */
	private static currentPanel: MainPanel | undefined;

	/** VSCode WebviewPanel 인스턴스 */
	private readonly panel: vscode.WebviewPanel;

	/** Extension 컨텍스트 — 리소스 경로 접근 등에 사용 */
	private readonly extensionUri: vscode.Uri;

	/** 패널 라이프사이클 관리용 disposable 목록 */
	private readonly disposables: vscode.Disposable[] = [];

	/**
	 * 웹뷰에서 수신한 최신 프로젝트 요구사항 입력값.
	 * 사용자가 textarea에 입력할 때마다 웹뷰 스크립트가 inputChanged 메시지를 전송하고,
	 * onDidReceiveMessage 핸들러에서 이 필드를 갱신한다.
	 */
	private _inputValue: string = '';

	/**
	 * MainPanel 생성자 — 외부에서 직접 호출하지 말 것.
	 * 패널 생성은 반드시 `MainPanel.show()` 정적 메서드를 통해 수행한다.
	 *
	 * @param panel - VSCode가 생성한 WebviewPanel 인스턴스
	 * @param extensionUri - Extension 루트 디렉토리 URI
	 */
	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this.panel = panel;
		this.extensionUri = extensionUri;

		// Webview 내부 HTML 콘텐츠 렌더링
		this._update();

		// 패널이 닫힐 때 리소스 해제
		this.panel.onDidDispose(
			() => this.dispose(),
			null,
			this.disposables
		);

		// 패널 가시성 변경 시 콘텐츠 갱신 (탭 전환 후 다시 포커스될 때 등)
		this.panel.onDidChangeViewState(
			() => {
				if (this.panel.visible) {
					this._update();
				}
			},
			null,
			this.disposables
		);

		// 웹뷰에서 전달되는 메시지 수신 — F-005: 입력값 변경 이벤트 처리
		this.panel.webview.onDidReceiveMessage(
			(message: WebviewMessage) => {
				this._processMessage(message);
			},
			null,
			this.disposables
		);
	}

	/**
	 * 현재 메인 패널이 열려 있는지 여부를 반환한다.
	 * F-032 테스트에서 싱글톤 동작을 검증하는 데 사용한다.
	 *
	 * @returns 패널이 열려 있으면 true, 닫혀 있으면 false
	 */
	public static isOpen(): boolean {
		return MainPanel.currentPanel !== undefined;
	}

	/**
	 * 현재 저장된 프로젝트 요구사항 입력값을 반환한다.
	 * F-005: 웹뷰에서 수신한 입력값을 서비스 레이어 또는 테스트에서 조회할 때 사용한다.
	 *
	 * @returns 저장된 입력값 문자열 (패널이 없거나 아직 입력이 없으면 빈 문자열)
	 */
	public static getInputValue(): string {
		return MainPanel.currentPanel?._inputValue ?? '';
	}

	/**
	 * 테스트 환경에서 웹뷰 메시지 수신을 시뮬레이션한다.
	 * 실제 웹뷰 샌드박스 환경에서는 직접 메시지를 주입할 수 없으므로,
	 * 메시지 처리 로직을 검증하기 위해 테스트 코드에서만 호출한다.
	 *
	 * @param message - 시뮬레이션할 WebviewMessage 객체
	 */
	public static simulateWebviewMessage(message: WebviewMessage): void {
		if (MainPanel.currentPanel) {
			MainPanel.currentPanel._processMessage(message);
		}
	}

	/**
	 * 현재 패널의 웹뷰 HTML 콘텐츠를 반환한다.
	 * 테스트에서 HTML에 필요한 폼 요소가 포함되어 있는지 검증하는 데 사용한다.
	 *
	 * @returns 현재 웹뷰 HTML 문자열 (패널이 없으면 빈 문자열)
	 */
	public static getHtmlForTest(): string {
		return MainPanel.currentPanel?.panel.webview.html ?? '';
	}

	/**
	 * 메인 패널을 열거나 이미 열려 있으면 포커스를 이동한다.
	 * F-004: 명령 실행 시 WebviewPanel이 열리는 진입점.
	 * F-032: 이미 열린 패널이 있는 경우 새 패널을 생성하지 않고 기존 패널을 활성화한다.
	 *
	 * @param extensionUri - Extension 루트 디렉토리 URI (package.json 기준 경로 해석용)
	 */
	public static show(extensionUri: vscode.Uri): void {
		// 현재 활성 편집기 그룹 오른쪽 열에 패널 표시
		const column = vscode.window.activeTextEditor
			? vscode.ViewColumn.Beside
			: vscode.ViewColumn.One;

		// 이미 열린 패널이 존재하면 포커스만 이동하고 반환 (F-032 대응)
		if (MainPanel.currentPanel) {
			MainPanel.currentPanel.panel.reveal(column);
			return;
		}

		// 새 WebviewPanel 생성
		const panel = vscode.window.createWebviewPanel(
			MainPanel.VIEW_TYPE,
			'Agent Harness',  // 패널 탭 제목
			column,
			{
				// JavaScript 실행 허용 — 웹뷰 스크립트(postMessage)를 위해 필수
				enableScripts: true,
				// 패널이 숨겨져도 DOM 상태(입력값 포함) 유지 — F-005: 포커스 이탈 후 입력값 보존
				retainContextWhenHidden: true,
			}
		);

		// 새 인스턴스 생성 및 싱글톤 등록
		MainPanel.currentPanel = new MainPanel(panel, extensionUri);
	}

	/**
	 * 웹뷰에서 수신한 메시지를 처리한다.
	 * 메시지 타입에 따라 내부 상태를 갱신한다.
	 *
	 * @param message - 웹뷰에서 전달된 메시지 객체
	 */
	private _processMessage(message: WebviewMessage): void {
		if (message.type === 'inputChanged') {
			// 사용자 입력값을 Extension 측에 저장
			this._inputValue = message.value;
		}
	}

	/**
	 * Webview HTML 콘텐츠를 갱신한다.
	 * 현재는 프로젝트 요구사항 입력 폼을 렌더링하며, 이후 단계에서 추가 UI가 더해진다.
	 */
	private _update(): void {
		this.panel.webview.html = this._getHtmlContent();
	}

	/**
	 * Webview에 표시할 HTML 문자열을 반환한다.
	 * VSCode Webview 보안 정책에 따라 nonce 기반 CSP(Content Security Policy)를 적용한다.
	 * F-005: 프로젝트 요구사항 텍스트를 입력하는 textarea 폼을 포함한다.
	 *
	 * @returns HTML 문자열
	 */
	private _getHtmlContent(): string {
		// 보안: 인라인 스크립트·스타일 허용을 위한 nonce 생성
		const nonce = this._getNonce();

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
	<title>Agent Harness</title>
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

		/* 요구사항 입력 textarea — VSCode 인풋 테마 변수 적용 */
		#requirement-input {
			width: 100%;
			min-height: 200px;
			padding: 8px;
			box-sizing: border-box;
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border, transparent);
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			resize: vertical;
			line-height: 1.5;
		}

		#requirement-input:focus {
			outline: 1px solid var(--vscode-focusBorder);
			border-color: var(--vscode-focusBorder);
		}

		#requirement-input::placeholder {
			color: var(--vscode-input-placeholderForeground);
		}
	</style>
</head>
<body>
	<h1>Agent Harness Framework</h1>

	<!-- F-005: 프로젝트 요구사항 입력 폼 -->
	<div class="form-group">
		<label for="requirement-input">프로젝트 요구사항</label>
		<textarea
			id="requirement-input"
			placeholder="프로젝트 요구사항을 입력하세요..."
		></textarea>
	</div>

	<script nonce="${nonce}">
		// VSCode Webview API 초기화 — postMessage, getState, setState 사용 가능
		const vscode = acquireVsCodeApi();
		const textarea = document.getElementById('requirement-input');

		// 입력값 변경 시 Extension으로 메시지 전송 — Extension 측에서 값을 저장함
		textarea.addEventListener('input', () => {
			vscode.postMessage({ type: 'inputChanged', value: textarea.value });
		});
	</script>
</body>
</html>`;
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
		MainPanel.currentPanel = undefined;

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
