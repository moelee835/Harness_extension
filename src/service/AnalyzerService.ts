// Node.js path 모듈 — 파일 경로 조합에 사용
import * as path from 'path';
// CLI 에이전트 실행기 인터페이스 — sub-agent 호출에 사용
import type { IAgentRunner } from './IAgentRunner.js';
// 파일 영속성 관리 클래스 — 생성된 .md 파일 저장에 사용
import { FileManager } from '../persistence/FileManager.js';

/**
 * AnalyzerService.generateCommand() 호출 결과를 담는 객체.
 * 생성된 파일의 절대 경로와 파일 내용을 포함한다.
 */
export interface CommandAnalysisResult {
	/** 생성된 커맨드 .md 파일의 절대 경로 */
	filePath: string;
	/** 파일에 기록된 Markdown 내용 */
	content: string;
}

/**
 * CLI 에이전트(sub-agent)를 통해 요구사항을 분석하고 결과물(.md 파일)을 생성하는 서비스.
 *
 * F-008: 커맨드 .md 파일 생성 (.claude/commands/)
 * F-009: 스킬 .md 파일 생성
 * F-010: MCP 서버 스펙 파일 생성
 * F-011: 훅 설정 항목 생성
 * F-012: 서브에이전트 .md 파일 생성 (.claude/agents/)
 *
 * 에이전트에게 구조화된 프롬프트를 전달하고,
 * 에이전트가 stdout으로 출력한 Markdown 내용을 파싱하여 FileManager로 저장한다.
 */
export class AnalyzerService {

	/** CLI 에이전트 실행기 — sub-agent 호출에 사용 */
	private readonly _runner: IAgentRunner;

	/** 파일 영속성 관리자 — 생성된 .md 파일 저장에 사용 */
	private readonly _fileManager: FileManager;

	/**
	 * AnalyzerService 생성자.
	 *
	 * @param runner - CLI 에이전트 실행기 (IAgentRunner 구현체)
	 * @param fileManager - FileManager 인스턴스 (파일 CRUD 담당)
	 */
	constructor(runner: IAgentRunner, fileManager: FileManager) {
		this._runner = runner;
		this._fileManager = fileManager;
	}

	/**
	 * Markdown 형식의 요구사항 입력을 받아 CLI 에이전트(sub-agent)를 통해
	 * 커맨드 .md 파일을 지정된 디렉토리에 생성한다.
	 *
	 * F-008: CLI 에이전트가 stdout으로 출력한 Markdown(YAML frontmatter 포함)을
	 * 파싱하여 name 필드를 커맨드 이름으로 사용하고,
	 * commandsDir/<커맨드-이름>.md 경로에 파일을 생성한다.
	 *
	 * 에이전트 출력 형식 예시:
	 * ```
	 * ---
	 * name: my-command
	 * description: 커맨드 설명
	 * ---
	 *
	 * # my-command
	 * ...
	 * ```
	 *
	 * @param markdownInput - 커맨드를 설명하는 Markdown 형식의 요구사항 문자열
	 * @param commandsDir - 생성될 파일을 저장할 디렉토리 절대 경로 (통상 .claude/commands/)
	 * @returns 생성된 파일 경로와 내용을 담은 결과 객체
	 * @throws CLI 에이전트 출력에서 커맨드 이름을 추출할 수 없으면 Error를 던진다
	 */
	public async generateCommand(
		markdownInput: string,
		commandsDir: string,
	): Promise<CommandAnalysisResult> {
		// CLI 에이전트에게 전달할 프롬프트 구성
		const prompt = this._buildCommandPrompt(markdownInput);

		// CLI 에이전트(sub-agent) 호출 — stdout 청크를 배열로 수집
		const stdoutChunks: string[] = [];
		await this._runner.invoke(
			prompt,
			(chunk) => stdoutChunks.push(chunk),
			undefined,
		);

		// 수집된 stdout 전체를 파일 내용으로 사용
		const content = stdoutChunks.join('');

		// YAML frontmatter에서 커맨드 이름 추출
		const commandName = this._extractCommandName(content);
		if (commandName === null) {
			throw new Error(
				'CLI 에이전트 출력에서 커맨드 이름(name 필드)을 추출할 수 없습니다. ' +
				'에이전트 출력이 YAML frontmatter(name: <이름>)를 포함해야 합니다.',
			);
		}

		// 파일 저장 경로: commandsDir/<커맨드-이름>.md
		const filePath = path.join(commandsDir, `${commandName}.md`);

		// FileManager를 통해 파일 생성
		await this._fileManager.create(filePath, content);

		return { filePath, content };
	}

	/**
	 * CLI 에이전트에게 전달할 커맨드 생성 프롬프트를 구성한다.
	 * 에이전트는 YAML frontmatter(name 필드 포함)와 커맨드 설명 Markdown을
	 * stdout으로 출력해야 한다.
	 *
	 * @param markdownInput - 사용자가 입력한 요구사항 Markdown 문자열
	 * @returns CLI 에이전트에게 전달할 프롬프트 문자열
	 */
	private _buildCommandPrompt(markdownInput: string): string {
		return [
			'다음 요구사항을 분석하여 Claude Code 슬래시 커맨드 파일을 생성하세요.',
			'',
			'출력 형식은 반드시 YAML frontmatter를 포함한 Markdown이어야 합니다:',
			'',
			'---',
			'name: <커맨드-이름> (영문 소문자와 하이픈만 허용)',
			'description: <커맨드 한 줄 설명>',
			'---',
			'',
			'# <커맨드 이름>',
			'',
			'## 역할',
			'<커맨드의 역할과 목적>',
			'',
			'## 수행 단계',
			'<커맨드가 수행해야 할 단계들>',
			'',
			'---',
			'',
			'요구사항:',
			markdownInput,
		].join('\n');
	}

	/**
	 * CLI 에이전트가 출력한 Markdown 문자열에서
	 * YAML frontmatter의 name 필드 값을 추출한다.
	 *
	 * @param content - CLI 에이전트가 stdout으로 출력한 전체 Markdown 문자열
	 * @returns 추출된 커맨드 이름 문자열. 없으면 null 반환.
	 */
	private _extractCommandName(content: string): string | null {
		// YAML frontmatter에서 "name: <값>" 패턴을 멀티라인 정규식으로 추출
		const nameMatch = /^name:\s*(.+)$/m.exec(content);
		if (!nameMatch || !nameMatch[1]) {
			return null;
		}
		// 앞뒤 공백 제거 후 반환
		return nameMatch[1].trim();
	}
}
