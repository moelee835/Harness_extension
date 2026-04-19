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
// Gemini CLI 실행기 클래스 가져오기 — 테스트에서 instanceof 검증에 사용
import { GeminiCliRunner } from './service/GeminiCliRunner.js';
// 사용자 지정 CLI 실행기 클래스 가져오기 — 테스트에서 instanceof 검증에 사용
import { CustomCliRunner } from './service/CustomCliRunner.js';
// 프로젝트 초기화 서비스 가져오기 — F-007: Init Project 흐름을 담당
import { InitService } from './service/InitService.js';
// 파일 영속성 관리 클래스 가져오기 — F-021~F-025: .md 파일 CRUD 담당
import { FileManager } from './persistence/FileManager.js';
// 요구사항 분석 서비스 가져오기 — F-008~F-012: CLI sub-agent를 통해 .md 파일 생성
import { AnalyzerService } from './service/AnalyzerService.js';
// 플랜 서비스 가져오기 — F-013: PLAN.md를 읽어 단계별 플랜 데이터를 파싱
import { PlanService } from './service/PlanService.js';
// 플랜 뷰 UI 클래스 가져오기 — F-013: PLAN.md 내용을 단계별 목록으로 렌더링하는 WebviewPanel
import { PlanView } from './ui/PlanView.js';

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
	/** 테스트에서 instanceof GeminiCliRunner 검증에 사용 */
	GeminiCliRunner: typeof GeminiCliRunner;
	/** 테스트에서 instanceof CustomCliRunner 검증에 사용 */
	CustomCliRunner: typeof CustomCliRunner;
	/** 테스트에서 InitService 생성 및 프롬프트 로딩을 검증하기 위해 노출 */
	InitService: typeof InitService;
	/** 테스트에서 FileManager 인스턴스 생성 및 파일 CRUD 동작을 검증하기 위해 노출 */
	FileManager: typeof FileManager;
	/** 테스트에서 AnalyzerService 인스턴스 생성 및 generateCommand() 동작을 검증하기 위해 노출 */
	AnalyzerService: typeof AnalyzerService;
	/** 테스트에서 PlanService 인스턴스 생성 및 loadPlan() 동작을 검증하기 위해 노출 */
	PlanService: typeof PlanService;
	/** 테스트에서 PlanView 싱글톤 상태 및 HTML 렌더링을 검증하기 위해 노출 */
	PlanView: typeof PlanView;
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

			// F-007: Init Project 버튼 클릭 시 호출될 콜백 등록
			// 패널 생성 후(또는 이미 열려 있는 경우) 콜백을 등록하여 InitService와 연결한다
			MainPanel.setOnInitRequested(() => {
				// AgentRunnerFactory로 현재 설정에 맞는 Runner 생성
				const runner = AgentRunnerFactory.create();
				const initService = new InitService(runner);

				// InitService.run() 실행 — stdout/stderr를 MainPanel.appendOutput으로 스트리밍
				initService.run(
					(chunk) => MainPanel.appendOutput(chunk, false),
					(chunk) => MainPanel.appendOutput(chunk, true),
				).then(async (result) => {
					// 성공 완료: UI에 성공 메시지와 생성된 파일 목록 표시
					MainPanel.setRunning(false);
					MainPanel.showSuccess(result.message, result.createdFiles);

					// F-026: 에이전트 액션 완료 후 .claude/ 디렉토리의 파일 목록을 UI에 표시
					// 워크스페이스가 없으면 목록 조회를 건너뛴다
					const workspaceFolders = vscode.workspace.workspaceFolders;
					if (workspaceFolders && workspaceFolders.length > 0) {
						const claudeDir = vscode.Uri.joinPath(workspaceFolders[0].uri, '.claude').fsPath;
						try {
							const fileManager = new FileManager();
							const files = await fileManager.list(claudeDir);
							MainPanel.showFileList(files);
						} catch {
							// .claude/ 디렉토리가 없거나 접근 불가 시 파일 목록 표시를 생략한다
						}
					}
				}).catch((err: unknown) => {
					// 오류 발생: UI에 오류 메시지 표시
					const errorMessage = err instanceof Error
						? err.message
						: '알 수 없는 오류가 발생했습니다.';
					MainPanel.showError(errorMessage);
				});
			});
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

	// openPlanView 명령 등록 — F-013: PLAN.md 내용을 단계별 목록으로 표시하는 뷰 열기
	// package.json의 contributes.commands에 선언된 ID와 반드시 일치해야 함
	const openPlanViewDisposable = vscode.commands.registerCommand(
		'agent-harness-framework.openPlanView',
		async () => {
			// 워크스페이스 루트 폴더를 기반으로 PLAN.md 경로 구성
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders || workspaceFolders.length === 0) {
				vscode.window.showErrorMessage('플랜 뷰를 열려면 워크스페이스 폴더가 필요합니다.');
				return;
			}

			// 기본 플랜 경로: <워크스페이스 루트>/.claude/plans/PLAN.md
			const planFilePath = vscode.Uri.joinPath(
				workspaceFolders[0].uri,
				'.claude', 'plans', 'PLAN.md'
			).fsPath;

			try {
				// PlanService로 PLAN.md를 읽어 파싱
				const fileManager = new FileManager();
				const planService = new PlanService(fileManager);
				const planData = await planService.loadPlan(planFilePath);
				// PlanView에 파싱된 플랜 데이터를 전달하여 렌더링
				PlanView.show(context.extensionUri, planData);
			} catch (err: unknown) {
				// PLAN.md 읽기 실패 시 오류 메시지 표시
				const errorMessage = err instanceof Error
					? err.message
					: '알 수 없는 오류가 발생했습니다.';
				vscode.window.showErrorMessage(`PLAN.md를 읽을 수 없습니다: ${errorMessage}`);
			}
		}
	);

	// 등록한 모든 disposable을 subscriptions에 추가하여 Extension 비활성화 시 자동 해제
	context.subscriptions.push(helloWorldDisposable, openMainPanelDisposable, openAgentSettingsDisposable, openPlanViewDisposable);

	// ExtensionApi 반환 — 테스트 환경에서 ext.exports.XXX 형태로 접근 가능
	return { MainPanel, AgentSettingsView, AgentRunnerFactory, ClaudeCodeRunner, GeminiCliRunner, CustomCliRunner, InitService, FileManager, AnalyzerService, PlanService, PlanView };
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
