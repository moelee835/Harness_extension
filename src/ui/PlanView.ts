// VSCode Extension API 가져오기
import * as vscode from 'vscode';
// PlanData 타입 가져오기 — PlanService.loadPlan() 반환값
import type { PlanData } from '../service/PlanService.js';

/**
 * PLAN.md 내용을 단계별 목록으로 렌더링하는 WebviewPanel 관리 클래스.
 *
 * F-013: 현재 PLAN.md 파일의 내용을 읽기 쉬운 단계별 목록으로 표시한다.
 * 완료된 단계(`[x]`)와 미완료 단계(`[ ]`)를 시각적으로 구분하여 표시한다.
 *
 * 싱글톤 패턴을 사용하여 하나의 패널만 유지하며,
 * 패널이 이미 열려 있는 경우 포커스를 이동하고 플랜 데이터를 갱신한다.
 */
export class PlanView {
	/** WebviewPanel 뷰 타입 식별자 — VSCode가 패널 직렬화/복원 시 사용 */
	public static readonly VIEW_TYPE = 'agentHarnessPlan';

	/** 현재 열려 있는 패널 인스턴스 (없으면 undefined) */
	private static currentPanel: PlanView | undefined;

	/** VSCode WebviewPanel 인스턴스 */
	private readonly panel: vscode.WebviewPanel;

	/** Extension 컨텍스트 URI — 향후 리소스 경로 접근에 사용 */
	private readonly extensionUri: vscode.Uri;

	/** 패널 라이프사이클 관리용 disposable 목록 */
	private readonly disposables: vscode.Disposable[] = [];

	/**
	 * 현재 렌더링할 플랜 데이터.
	 * show() 호출 시 전달받으며, 패널이 열려 있는 경우 갱신 시 _update()가 재호출된다.
	 */
	private _planData: PlanData;

	/**
	 * PlanView 생성자 — 외부에서 직접 호출하지 말 것.
	 * 패널 생성은 반드시 `PlanView.show()` 정적 메서드를 통해 수행한다.
	 *
	 * @param panel - VSCode가 생성한 WebviewPanel 인스턴스
	 * @param extensionUri - Extension 루트 디렉토리 URI
	 * @param planData - 초기 렌더링에 사용할 플랜 데이터
	 */
	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, planData: PlanData) {
		this.panel = panel;
		this.extensionUri = extensionUri;
		this._planData = planData;

		// 초기 HTML 렌더링
		this._update();

		// 패널이 닫힐 때 리소스 해제
		this.panel.onDidDispose(
			() => this.dispose(),
			null,
			this.disposables
		);

		// 패널 가시성 변경 시 HTML 재렌더링 (탭 전환 후 다시 포커스될 때 등)
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
	 * PlanView 패널을 열거나 이미 열려 있으면 플랜 데이터를 갱신하고 포커스를 이동한다.
	 *
	 * F-013: 명령 핸들러 또는 테스트에서 호출하여 플랜을 표시한다.
	 *
	 * @param extensionUri - Extension 루트 디렉토리 URI
	 * @param planData - 렌더링할 플랜 데이터 (PlanService.loadPlan()의 반환값)
	 */
	public static show(extensionUri: vscode.Uri, planData: PlanData): void {
		// 현재 활성 편집기 그룹 오른쪽 열에 패널 표시
		const column = vscode.window.activeTextEditor
			? vscode.ViewColumn.Beside
			: vscode.ViewColumn.One;

		// 이미 열린 패널이 있으면 데이터를 갱신하고 포커스만 이동
		if (PlanView.currentPanel) {
			PlanView.currentPanel._planData = planData;
			PlanView.currentPanel._update();
			PlanView.currentPanel.panel.reveal(column);
			return;
		}

		// 새 WebviewPanel 생성 — 스크립트 비활성화(플랜은 읽기 전용 렌더링)
		const panel = vscode.window.createWebviewPanel(
			PlanView.VIEW_TYPE,
			'Plan View',
			column,
			{
				// 플랜은 읽기 전용이므로 JavaScript 실행 불필요
				enableScripts: false,
				// 패널이 숨겨져도 상태 유지
				retainContextWhenHidden: true,
			}
		);

		// 새 인스턴스 생성 및 싱글톤 등록
		PlanView.currentPanel = new PlanView(panel, extensionUri, planData);
	}

	/**
	 * 현재 패널이 열려 있는지 여부를 반환한다.
	 * F-013 테스트에서 싱글톤 동작을 검증하는 데 사용한다.
	 *
	 * @returns 패널이 열려 있으면 true, 닫혀 있으면 false
	 */
	public static isOpen(): boolean {
		return PlanView.currentPanel !== undefined;
	}

	/**
	 * 현재 패널의 웹뷰 HTML 콘텐츠를 반환한다.
	 * F-013 테스트에서 HTML에 단계 목록이 올바르게 렌더링되었는지 검증하는 데 사용한다.
	 *
	 * @returns 현재 웹뷰 HTML 문자열 (패널이 없으면 빈 문자열)
	 */
	public static getHtmlForTest(): string {
		return PlanView.currentPanel?.panel.webview.html ?? '';
	}

	/**
	 * 패널을 강제로 닫고 싱글톤 상태를 초기화한다.
	 * F-013 테스트에서 각 테스트 케이스 간 상태 격리를 위해 사용한다.
	 */
	public static disposeForTest(): void {
		PlanView.currentPanel?.dispose();
	}

	/**
	 * Webview HTML 콘텐츠를 갱신한다.
	 * 플랜 데이터가 변경되거나 패널이 다시 표시될 때 호출된다.
	 */
	private _update(): void {
		this.panel.webview.html = this._getHtmlContent();
	}

	/**
	 * Webview에 표시할 HTML 문자열을 반환한다.
	 * CSP nonce를 적용하여 인라인 스타일만 허용하고 스크립트는 허용하지 않는다.
	 *
	 * F-013: 플랜 섹션과 단계를 목록 형태로 렌더링한다.
	 * 완료된 단계(`step-completed`)와 미완료 단계(`step-pending`)를 CSS 클래스로 구분한다.
	 *
	 * @returns HTML 문자열
	 */
	private _getHtmlContent(): string {
		// 보안: 인라인 스타일 허용을 위한 nonce 생성
		const nonce = this._getNonce();
		// 섹션 HTML 렌더링 — 섹션이 없으면 빈 메시지 표시
		const sectionsHtml = this._renderSections();

		return /* html */`<!DOCTYPE html>
<html lang="ko">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<!-- CSP: nonce가 일치하는 스타일만 허용, 스크립트 완전 차단 -->
	<meta http-equiv="Content-Security-Policy"
		content="default-src 'none';
				 style-src 'nonce-${nonce}';">
	<title>Plan View</title>
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

		/* 섹션 제목 (## 수준) */
		h2 {
			font-size: 1.1em;
			font-weight: 600;
			margin-top: 20px;
			margin-bottom: 8px;
			color: var(--vscode-editor-foreground);
			border-bottom: 1px solid var(--vscode-panel-border, #444);
			padding-bottom: 4px;
		}

		/* 단계 목록 컨테이너 — 기본 불릿 제거 */
		.plan-steps {
			list-style: none;
			padding: 0;
			margin: 0 0 12px 0;
		}

		/* 개별 단계 항목 — 번호 인디케이터와 텍스트를 가로로 배치 */
		.plan-step {
			display: flex;
			align-items: flex-start;
			gap: 8px;
			padding: 4px 0;
			line-height: 1.5;
		}

		/* 완료 단계 텍스트 — 취소선 + 초록 색으로 완료 상태 표시 */
		.step-completed {
			color: var(--vscode-testing-iconPassed, #73c991);
			text-decoration: line-through;
			opacity: 0.8;
		}

		/* 미완료 단계 텍스트 — 일반 전경색으로 표시 */
		.step-pending {
			color: var(--vscode-foreground);
		}

		/* 완료 인디케이터 (✓) — 초록 색 */
		.step-indicator-completed {
			color: var(--vscode-testing-iconPassed, #73c991);
			font-weight: bold;
			min-width: 20px;
			flex-shrink: 0;
		}

		/* 미완료 인디케이터 (번호) — 회색 계열로 표시 */
		.step-indicator-pending {
			color: var(--vscode-descriptionForeground, #9d9d9d);
			min-width: 20px;
			flex-shrink: 0;
		}

		/* 섹션 없음 또는 빈 상태 안내 메시지 */
		.empty-message {
			color: var(--vscode-descriptionForeground, #9d9d9d);
			font-style: italic;
			margin-top: 12px;
		}
	</style>
</head>
<body>
	<h1>Plan View</h1>
	${sectionsHtml !== '' ? sectionsHtml : '<p class="empty-message">PLAN.md에 플랜 섹션이 없습니다.</p>'}
</body>
</html>`;
	}

	/**
	 * 모든 섹션을 HTML 문자열로 렌더링한다.
	 * 각 섹션은 `<h2>` 제목과 `<ul class="plan-steps">` 목록으로 구성된다.
	 *
	 * @returns 렌더링된 섹션 HTML 문자열 (섹션이 없으면 빈 문자열)
	 */
	private _renderSections(): string {
		if (this._planData.sections.length === 0) {
			return '';
		}

		return this._planData.sections.map(section => {
			// 섹션 내 단계가 없는 경우 기본 메시지 표시
			if (section.steps.length === 0) {
				const emptyItem = '<li class="plan-step"><span class="step-indicator-pending">-</span><span class="step-pending">단계 없음</span></li>';
				return `<h2>${this._escapeHtml(section.title)}</h2>\n<ul class="plan-steps">\n${emptyItem}\n</ul>`;
			}

			// 각 단계를 완료/미완료에 따라 다른 CSS 클래스로 렌더링
			const stepsHtml = section.steps.map((step, index) => {
				// 완료 단계: ✓ 인디케이터 + step-completed 텍스트 클래스
				// 미완료 단계: 번호 인디케이터 + step-pending 텍스트 클래스
				const indicatorClass = step.completed ? 'step-indicator-completed' : 'step-indicator-pending';
				const textClass = step.completed ? 'step-completed' : 'step-pending';
				const indicatorText = step.completed ? '✓' : `${index + 1}.`;
				const escapedText = this._escapeHtml(step.text);
				return `<li class="plan-step"><span class="${indicatorClass}">${indicatorText}</span><span class="${textClass}">${escapedText}</span></li>`;
			}).join('\n');

			return `<h2>${this._escapeHtml(section.title)}</h2>\n<ul class="plan-steps">\n${stepsHtml}\n</ul>`;
		}).join('\n');
	}

	/**
	 * HTML 특수 문자를 이스케이프하여 XSS 공격을 방지한다.
	 * 섹션 제목과 단계 텍스트 등 동적으로 생성되는 콘텐츠에 적용한다.
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
		PlanView.currentPanel = undefined;

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
