// VSCode Extension API 가져오기
import * as vscode from 'vscode';
// Markdown 변환 서비스 가져오기
import { MarkdownConverter } from '../service/MarkdownConverter.js';

/**
 * 웹뷰에서 Extension으로 전달되는 입력값 변경 메시지.
 * 사용자가 textarea에 내용을 입력할 때 웹뷰 스크립트가 이 형식으로 postMessage를 호출한다.
 */
export interface InputChangedMessage {
	/** 메시지 종류 식별자 */
	type: 'inputChanged';
	/** 변경된 입력값 */
	value: string;
}

/**
 * 웹뷰에서 Extension으로 전달되는 Markdown 변환 요청 메시지.
 * 사용자가 "Markdown으로 변환" 버튼을 클릭할 때 웹뷰 스크립트가 이 형식으로 postMessage를 호출한다.
 */
export interface ConvertRequestedMessage {
	/** 메시지 종류 식별자 */
	type: 'convertRequested';
}

/**
 * 웹뷰에서 Extension으로 전달되는 에이전트 취소 요청 메시지.
 * 사용자가 '취소' 버튼을 클릭할 때 웹뷰 스크립트가 이 형식으로 postMessage를 호출한다.
 * F-034: 실행 중인 에이전트 프로세스 취소 요청.
 */
export interface CancelRequestedMessage {
	/** 메시지 종류 식별자 */
	type: 'cancelRequested';
}

/**
 * 웹뷰에서 Extension으로 전달되는 메시지 유니온 타입.
 * F-005: 입력값 변경 메시지
 * F-006: Markdown 변환 요청 메시지
 * F-034: 에이전트 취소 요청 메시지
 */
export type WebviewMessage = InputChangedMessage | ConvertRequestedMessage | CancelRequestedMessage;

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
	 * 사용자가 "Markdown으로 변환" 버튼을 클릭했을 때 MarkdownConverter가 생성한 Markdown 문자열.
	 * convertRequested 메시지 처리 후 이 필드에 저장되며, 이후 서비스 레이어로 전달된다.
	 */
	private _markdownValue: string = '';

	/** Markdown 변환 서비스 인스턴스 — 입력값을 Markdown 형식으로 변환하는 데 사용 */
	private readonly _markdownConverter: MarkdownConverter = new MarkdownConverter();

	/**
	 * 현재 에이전트 프로세스 실행 여부.
	 * true일 때 UI에 취소 버튼이 표시되며, false일 때 숨겨진다.
	 * F-034: setRunning() 정적 메서드로 외부에서 갱신 가능하다.
	 */
	private _isRunning: boolean = false;

	/**
	 * 에이전트 실행 상태에 대한 사용자 표시용 상태 메시지.
	 * 취소 완료 또는 오류 발생 시 메시지가 설정되고, 새 실행 시 초기화된다.
	 * F-034: cancelRequested 처리 후 취소 완료 메시지가 이 필드에 저장된다.
	 */
	private _statusMessage: string = '';

	/**
	 * CLI 에이전트 프로세스가 출력한 stdout/stderr 텍스트 목록.
	 * appendOutput() 호출 시 추가되며, getOutputForTest()로 외부에서 조회 가능하다.
	 * F-020: 실시간 스트리밍 출력을 Extension 측에서 누적 저장한다.
	 */
	private _outputLines: string[] = [];

	/**
	 * 에이전트 CLI 프로세스가 오류 코드로 종료되었을 때 표시할 오류 메시지.
	 * showError() 호출 시 설정되고, setRunning(true) 호출 시 초기화된다.
	 * F-033: 오류 메시지와 종료 코드를 UI에 표시하는 데 사용된다.
	 */
	private _errorMessage: string = '';

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
	 * 에이전트 실행 상태를 설정하고 UI를 갱신한다.
	 * true이면 취소 버튼이 표시되고 이전 상태 메시지가 초기화된다.
	 * false이면 취소 버튼이 숨겨진다.
	 * F-034: 에이전트 실행 시작/종료 시 Extension이 이 메서드를 호출하여 UI를 동기화한다.
	 *
	 * @param running - 실행 중이면 true, 종료되었으면 false
	 */
	public static setRunning(running: boolean): void {
		if (MainPanel.currentPanel) {
			MainPanel.currentPanel._isRunning = running;
			if (running) {
				// 새 실행 시작 시 이전 상태 메시지 및 오류 메시지 초기화
				MainPanel.currentPanel._statusMessage = '';
				MainPanel.currentPanel._errorMessage = '';
			}
			// HTML 재생성으로 취소 버튼 가시성 갱신
			MainPanel.currentPanel._update();
		}
	}

	/**
	 * 현재 에이전트 실행 상태를 반환한다.
	 * F-034: 테스트에서 setRunning()/cancelRequested 처리 후 상태 변화를 검증하는 데 사용한다.
	 *
	 * @returns 실행 중이면 true, 그렇지 않으면 false
	 */
	public static isRunningForTest(): boolean {
		return MainPanel.currentPanel?._isRunning ?? false;
	}

	/**
	 * 현재 상태 메시지를 반환한다.
	 * F-034: 테스트에서 취소 완료 메시지가 올바르게 설정되었는지 검증하는 데 사용한다.
	 *
	 * @returns 상태 메시지 문자열 (메시지가 없거나 패널이 없으면 빈 문자열)
	 */
	public static getStatusMessageForTest(): string {
		return MainPanel.currentPanel?._statusMessage ?? '';
	}

	/**
	 * CLI 에이전트 프로세스의 출력 텍스트를 웹뷰 출력 영역에 추가한다.
	 * Extension이 runner.invoke()의 onStdout/onStderr 콜백에서 이 메서드를 호출한다.
	 * F-020: 실시간 스트리밍 출력을 내부 버퍼에 누적하고 웹뷰에 전달한다.
	 *
	 * @param text - 출력 텍스트 청크
	 * @param isStderr - true이면 stderr(오류 스타일), false이면 stdout(일반 스타일)
	 */
	public static appendOutput(text: string, isStderr: boolean): void {
		if (MainPanel.currentPanel) {
			// 내부 버퍼에 누적 (테스트용 조회 지원)
			MainPanel.currentPanel._outputLines.push(text);
			// 웹뷰로 출력 데이터 전달 — 웹뷰 스크립트가 #output-area에 추가
			MainPanel.currentPanel.panel.webview.postMessage({
				type: 'appendOutput',
				text,
				isStderr,
			});
		}
	}

	/**
	 * 누적된 출력 텍스트 목록을 반환한다.
	 * F-020: 테스트에서 appendOutput() 호출 후 출력이 올바르게 저장되었는지 검증하는 데 사용한다.
	 *
	 * @returns 출력 텍스트 청크 배열 (패널이 없거나 출력이 없으면 빈 배열)
	 */
	public static getOutputForTest(): string[] {
		return MainPanel.currentPanel?._outputLines ?? [];
	}

	/**
	 * 출력 버퍼를 초기화한다.
	 * F-020: 테스트 간 출력 상태가 공유되지 않도록 각 테스트 시작 전에 호출한다.
	 */
	public static clearOutputForTest(): void {
		if (MainPanel.currentPanel) {
			MainPanel.currentPanel._outputLines = [];
		}
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
	 * 마지막으로 변환된 Markdown 문자열을 반환한다.
	 * F-006: convertRequested 메시지 처리 후 MarkdownConverter가 생성한 결과를 조회할 때 사용한다.
	 *
	 * @returns Markdown 문자열 (아직 변환 요청이 없었거나 패널이 없으면 빈 문자열)
	 */
	public static getMarkdownValue(): string {
		return MainPanel.currentPanel?._markdownValue ?? '';
	}

	/**
	 * 에이전트 CLI 프로세스가 오류 코드로 종료되었을 때 UI에 오류 메시지를 표시한다.
	 * 오류 메시지는 별도의 오류 영역(#error-message)에 붉은 색 경고 스타일로 렌더링된다.
	 * F-033: invoke()가 reject될 때 Extension 커맨드 핸들러가 이 메서드를 호출한다.
	 *
	 * @param message - 표시할 오류 메시지 문자열 (종료 코드 포함 권장)
	 */
	public static showError(message: string): void {
		if (MainPanel.currentPanel) {
			// 오류 메시지 저장 및 실행 상태 해제
			MainPanel.currentPanel._errorMessage = message;
			MainPanel.currentPanel._isRunning = false;
			// HTML 재생성으로 오류 영역 가시성 갱신
			MainPanel.currentPanel._update();
		}
	}

	/**
	 * 현재 설정된 오류 메시지를 반환한다.
	 * F-033: 테스트에서 showError() 호출 후 오류 메시지가 올바르게 설정되었는지 검증하는 데 사용한다.
	 *
	 * @returns 오류 메시지 문자열 (오류가 없거나 패널이 없으면 빈 문자열)
	 */
	public static getErrorMessageForTest(): string {
		return MainPanel.currentPanel?._errorMessage ?? '';
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
		} else if (message.type === 'convertRequested') {
			// F-006: 현재 입력값을 Markdown으로 변환하여 저장
			// MarkdownConverter는 데이터 손실 없이 모든 입력 내용을 Markdown 형식으로 보존한다
			this._markdownValue = this._markdownConverter.convert(this._inputValue);
		} else if (message.type === 'cancelRequested') {
			// F-034: 사용자가 취소 버튼을 클릭함 — 실행 상태 해제 및 취소 완료 메시지 설정
			// 실제 프로세스 종료는 Extension 커맨드 핸들러에서 runner.cancel()로 처리 (F-007 연동 시 구현)
			this._isRunning = false;
			this._statusMessage = '프로세스가 취소되었습니다.';
			// HTML 재생성으로 취소 버튼 숨기기 및 상태 메시지 표시
			this._update();
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
	 * F-006: Markdown으로 변환 버튼을 포함하여 변환 요청을 Extension에 전달한다.
	 *
	 * @returns HTML 문자열
	 */
	private _getHtmlContent(): string {
		// 보안: 인라인 스크립트·스타일 허용을 위한 nonce 생성
		const nonce = this._getNonce();

		// F-034: 취소 버튼 가시성 — 에이전트 실행 중일 때만 표시
		const cancelBtnStyle = this._isRunning ? '' : ' style="display:none"';
		// F-034: 상태 메시지 가시성 — 메시지가 있을 때만 표시
		const statusMsgStyle = this._statusMessage ? '' : ' style="display:none"';
		// 상태 메시지 XSS 방지를 위해 HTML 이스케이프 처리
		const escapedStatusMessage = this._escapeHtml(this._statusMessage);
		// F-033: 오류 메시지 가시성 — 오류가 있을 때만 표시
		const errorMsgStyle = this._errorMessage ? '' : ' style="display:none"';
		// 오류 메시지 XSS 방지를 위해 HTML 이스케이프 처리
		const escapedErrorMessage = this._escapeHtml(this._errorMessage);

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

		/* Markdown 변환 버튼 — VSCode 버튼 테마 변수 적용 */
		#convert-to-markdown-btn {
			padding: 6px 14px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			cursor: pointer;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
		}

		#convert-to-markdown-btn:hover {
			background-color: var(--vscode-button-hoverBackground);
		}

		/* F-034: 취소 버튼 — 에이전트 실행 중일 때만 표시되는 보조 버튼 */
		#cancel-btn {
			padding: 6px 14px;
			background-color: var(--vscode-button-secondaryBackground, #5f6a79);
			color: var(--vscode-button-secondaryForeground, #ffffff);
			border: none;
			cursor: pointer;
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			margin-left: 8px;
		}

		#cancel-btn:hover {
			background-color: var(--vscode-button-secondaryHoverBackground, #4e5a67);
		}

		/* F-034: 상태 메시지 영역 — 취소 완료, 오류 등 상태 정보 표시 */
		#status-message {
			margin-top: 12px;
			padding: 8px 12px;
			background-color: var(--vscode-inputValidation-infoBackground, #063b49);
			color: var(--vscode-inputValidation-infoForeground, #d4d4d4);
			border: 1px solid var(--vscode-inputValidation-infoBorder, #007acc);
			font-size: var(--vscode-font-size);
		}

		/* F-033: 오류 메시지 영역 — 프로세스 비정상 종료 시 오류 코드와 함께 표시 */
		#error-message {
			margin-top: 12px;
			padding: 8px 12px;
			background-color: var(--vscode-inputValidation-errorBackground, #5a1d1d);
			color: var(--vscode-inputValidation-errorForeground, #f48771);
			border: 1px solid var(--vscode-inputValidation-errorBorder, #f48771);
			font-size: var(--vscode-font-size);
		}

		/* F-020: CLI 에이전트 출력 영역 — 스크롤 가능한 터미널 스타일 */
		#output-area {
			margin-top: 16px;
			padding: 10px;
			background-color: var(--vscode-terminal-background, #1e1e1e);
			color: var(--vscode-terminal-foreground, #cccccc);
			font-family: var(--vscode-editor-font-family, monospace);
			font-size: var(--vscode-editor-font-size, 13px);
			min-height: 120px;
			max-height: 400px;
			overflow-y: auto;
			white-space: pre-wrap;
			word-break: break-all;
			border: 1px solid var(--vscode-panel-border, #444);
		}

		/* F-020: stderr 출력 텍스트 — 오류임을 구분하는 붉은 색 */
		#output-area .stderr-text {
			color: var(--vscode-terminal-ansiRed, #f44747);
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

	<!-- F-006: Markdown 변환 버튼 — 클릭 시 현재 입력값을 Markdown으로 변환하도록 Extension에 요청 -->
	<button id="convert-to-markdown-btn">Markdown으로 변환</button>

	<!-- F-034: 취소 버튼 — 에이전트 실행 중일 때만 표시, 클릭 시 실행 중인 프로세스 취소 요청 -->
	<button id="cancel-btn"${cancelBtnStyle}>취소</button>

	<!-- F-034: 상태 메시지 영역 — 취소 완료 또는 오류 발생 시 메시지 표시 -->
	<div id="status-message"${statusMsgStyle}>${escapedStatusMessage}</div>

	<!-- F-033: 오류 메시지 영역 — 에이전트 CLI 프로세스가 오류 코드로 종료될 때 표시 -->
	<div id="error-message"${errorMsgStyle}>${escapedErrorMessage}</div>

	<!-- F-020: CLI 에이전트 stdout/stderr 실시간 출력 영역 -->
	<div id="output-area"></div>

	<script nonce="${nonce}">
		// VSCode Webview API 초기화 — postMessage, getState, setState 사용 가능
		const vscode = acquireVsCodeApi();
		const textarea = document.getElementById('requirement-input');
		const convertBtn = document.getElementById('convert-to-markdown-btn');
		const cancelBtn = document.getElementById('cancel-btn');

		// 입력값 변경 시 Extension으로 메시지 전송 — Extension 측에서 값을 저장함
		textarea.addEventListener('input', () => {
			vscode.postMessage({ type: 'inputChanged', value: textarea.value });
		});

		// 변환 버튼 클릭 시 Extension으로 변환 요청 메시지 전송
		convertBtn.addEventListener('click', () => {
			vscode.postMessage({ type: 'convertRequested' });
		});

		// F-034: 취소 버튼 클릭 시 Extension으로 취소 요청 메시지 전송
		cancelBtn.addEventListener('click', () => {
			vscode.postMessage({ type: 'cancelRequested' });
		});

		// F-020: Extension에서 전달되는 출력 데이터 처리 — #output-area에 텍스트 추가
		window.addEventListener('message', (event) => {
			const message = event.data;
			if (message.type === 'appendOutput') {
				const outputArea = document.getElementById('output-area');
				if (outputArea) {
					const span = document.createElement('span');
					// stderr이면 붉은 색 클래스 적용하여 일반 출력과 구별
					if (message.isStderr) {
						span.className = 'stderr-text';
					}
					span.textContent = message.text;
					outputArea.appendChild(span);
					// 최신 출력으로 자동 스크롤
					outputArea.scrollTop = outputArea.scrollHeight;
				}
			}
		});
	</script>
</body>
</html>`;
	}

	/**
	 * HTML 특수 문자를 이스케이프하여 XSS 공격을 방지한다.
	 * 상태 메시지 등 동적으로 생성되는 HTML 콘텐츠에 적용한다.
	 *
	 * @param text - 이스케이프할 원본 문자열
	 * @returns HTML 특수 문자가 엔티티로 치환된 안전한 문자열
	 */
	private _escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
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
