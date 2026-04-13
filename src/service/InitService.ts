// VSCode Extension API 가져오기
import * as vscode from 'vscode';
// IAgentRunner 인터페이스 가져오기
import type { IAgentRunner } from './IAgentRunner.js';
// 내장 init 프롬프트 상수 가져오기 — 외부 파일 의존 없이 번들에 포함됨
import { INIT_CLAUDE_PROJECT_PROMPT } from './prompts/initClaudeProject.js';

/**
 * Init 작업 완료 후 생성된 파일 목록과 성공 메시지를 담는 결과 객체.
 * F-007: InitService.run() 이 완료된 후 UI에 표시할 정보를 반환한다.
 */
export interface InitResult {
	/** 성공 여부 */
	success: boolean;
	/** 사용자에게 표시할 메시지 */
	message: string;
	/** 생성 또는 수정된 파일 경로 목록 (워크스페이스 루트 기준 상대 경로) */
	createdFiles: string[];
}

/**
 * 프로젝트 초기화를 담당하는 서비스 클래스.
 * F-007: 내장 init 프롬프트를 로드하고 설정된 CLI 에이전트를 호출하여
 * 워크스페이스에 .claude/ 디렉토리 및 하네스 파일들을 생성한다.
 *
 * 프롬프트는 외부 파일을 읽지 않고 번들에 포함된 INIT_CLAUDE_PROJECT_PROMPT 상수를 사용한다.
 * 에이전트 호출은 주입받은 IAgentRunner 구현체를 통해 수행된다 (DI 패턴).
 */
export class InitService {
	/** CLI 에이전트 실행기 — 생성자에서 주입받아 결합도를 낮춘다 */
	private readonly _runner: IAgentRunner;

	/**
	 * InitService 생성자.
	 * 에이전트 실행기를 외부에서 주입받아 특정 Runner 구현체에 대한 결합도를 낮춘다.
	 *
	 * @param runner - 프롬프트를 실행할 IAgentRunner 구현체
	 */
	constructor(runner: IAgentRunner) {
		this._runner = runner;
	}

	/**
	 * 내장 init 프롬프트를 사용하여 프로젝트 초기화를 수행한다.
	 * CLI 에이전트를 호출하여 .claude/ 디렉토리 및 하네스 파일을 생성한다.
	 * 완료 후 생성된 파일 목록을 스캔하여 결과 객체로 반환한다.
	 *
	 * F-007: 메인 패널의 'Init Project' 버튼 클릭 시 Extension 커맨드 핸들러가 이 메서드를 호출한다.
	 *
	 * @param onStdout - CLI 에이전트 stdout 출력 콜백 (선택) — UI 실시간 스트리밍에 사용
	 * @param onStderr - CLI 에이전트 stderr 출력 콜백 (선택) — UI 실시간 스트리밍에 사용
	 * @returns 초기화 결과 (성공 여부, 메시지, 생성된 파일 목록)
	 */
	public async run(
		onStdout?: (chunk: string) => void,
		onStderr?: (chunk: string) => void,
	): Promise<InitResult> {
		// 내장 init 프롬프트 로드 — 외부 파일을 읽지 않으므로 번들 외부 의존성 없음
		const prompt = INIT_CLAUDE_PROJECT_PROMPT;

		// CLI 에이전트 실행 — 에이전트가 .claude/ 하위 파일들을 생성한다
		await this._runner.invoke(prompt, onStdout, onStderr);

		// 에이전트 실행 완료 후 워크스페이스 내 .claude/ 디렉토리를 스캔하여 생성된 파일 목록 수집
		const createdFiles = await this._scanClaudeDirectory();

		return {
			success: true,
			message: '프로젝트 초기화가 완료되었습니다.',
			createdFiles,
		};
	}

	/**
	 * 내장 init 프롬프트 문자열을 반환한다.
	 * F-007: 테스트에서 외부 파일 의존 없이 프롬프트가 로드되는지 검증할 때 사용한다.
	 *
	 * @returns 내장 init 프롬프트 문자열
	 */
	public getPrompt(): string {
		return INIT_CLAUDE_PROJECT_PROMPT;
	}

	/**
	 * 워크스페이스 루트의 .claude/ 디렉토리를 재귀적으로 스캔하여
	 * 존재하는 파일들의 상대 경로 목록을 반환한다.
	 *
	 * 워크스페이스가 열려 있지 않거나 .claude/ 디렉토리가 없으면 빈 배열을 반환한다.
	 *
	 * @returns .claude/ 하위 파일 경로 목록 (워크스페이스 루트 기준 상대 경로)
	 */
	private async _scanClaudeDirectory(): Promise<string[]> {
		// 열려 있는 워크스페이스 폴더 확인
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return [];
		}

		// 첫 번째 워크스페이스 폴더의 .claude/ 디렉토리를 스캔
		const workspaceRoot = workspaceFolders[0].uri;
		const claudeUri = vscode.Uri.joinPath(workspaceRoot, '.claude');

		try {
			// .claude/ 디렉토리 존재 여부 확인
			await vscode.workspace.fs.stat(claudeUri);
		} catch {
			// .claude/ 디렉토리가 없으면 빈 배열 반환
			return [];
		}

		// .claude/ 하위 파일들 재귀 스캔
		return this._collectFiles(claudeUri, workspaceRoot.fsPath);
	}

	/**
	 * 주어진 디렉토리 URI 하위의 모든 파일 경로를 재귀적으로 수집한다.
	 *
	 * @param dirUri - 스캔할 디렉토리 URI
	 * @param rootPath - 상대 경로 계산 기준이 되는 워크스페이스 루트 절대 경로
	 * @returns 파일 상대 경로 목록
	 */
	private async _collectFiles(dirUri: vscode.Uri, rootPath: string): Promise<string[]> {
		const result: string[] = [];

		let entries: [string, vscode.FileType][];
		try {
			entries = await vscode.workspace.fs.readDirectory(dirUri);
		} catch {
			return result;
		}

		for (const [name, fileType] of entries) {
			const childUri = vscode.Uri.joinPath(dirUri, name);

			if (fileType === vscode.FileType.File) {
				// 파일인 경우 워크스페이스 루트 기준 상대 경로로 변환하여 추가
				const relativePath = childUri.fsPath.replace(rootPath, '').replace(/^[\\/]/, '');
				result.push(relativePath);
			} else if (fileType === vscode.FileType.Directory) {
				// 디렉토리인 경우 재귀 스캔
				const subFiles = await this._collectFiles(childUri, rootPath);
				result.push(...subFiles);
			}
		}

		return result;
	}
}
