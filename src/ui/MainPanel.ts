// VSCode Extension API 가져오기
import * as vscode from 'vscode';

/**
 * Agent Harness Framework의 메인 WebviewPanel을 관리하는 클래스.
 * F-004: Extension의 기본 명령 실행 시 메인 패널을 여는 기능을 담당한다.
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
				// JavaScript 실행 허용 (향후 웹뷰 스크립트 추가를 위해 활성화)
				enableScripts: true,
				// 패널이 숨겨져도 상태 유지 (탭 전환 시 콘텐츠 보존)
				retainContextWhenHidden: true,
			}
		);

		// 새 인스턴스 생성 및 싱글톤 등록
		MainPanel.currentPanel = new MainPanel(panel, extensionUri);
	}

	/**
	 * Webview HTML 콘텐츠를 갱신한다.
	 * 현재는 기본 레이아웃을 렌더링하며, 이후 단계에서 UI 컴포넌트가 추가된다.
	 */
	private _update(): void {
		this.panel.webview.html = this._getHtmlContent();
	}

	/**
	 * Webview에 표시할 HTML 문자열을 반환한다.
	 * VSCode Webview 보안 정책에 따라 nonce 기반 CSP(Content Security Policy)를 적용한다.
	 *
	 * @returns HTML 문자열
	 */
	private _getHtmlContent(): string {
		// 보안: 인라인 스크립트 허용을 위한 nonce 생성
		const nonce = this._getNonce();

		return /* html */`<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<!-- CSP: nonce가 일치하는 스크립트와 VSCode 테마 색상만 허용 -->
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
			margin-bottom: 8px;
			color: var(--vscode-editor-foreground);
		}

		p {
			color: var(--vscode-descriptionForeground);
			margin: 0;
		}
	</style>
</head>
<body>
	<h1>Agent Harness Framework</h1>
	<p>Claude Code 하네스 엔지니어링 패널입니다. 이후 단계에서 기능이 추가됩니다.</p>
</body>
</html>`;
	}

	/**
	 * CSP nonce로 사용할 무작위 문자열을 생성한다.
	 * 16바이트 무작위 값을 16진수 문자열로 변환하여 반환한다.
	 *
	 * @returns 32자리 16진수 nonce 문자열
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
