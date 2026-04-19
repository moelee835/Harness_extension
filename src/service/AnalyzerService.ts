// Node.js path 모듈 — 파일 경로 조합에 사용
import * as path from 'path';
// CLI 에이전트 실행기 인터페이스 — sub-agent 호출에 사용
import type { IAgentRunner } from './IAgentRunner.js';
// 파일 영속성 관리 클래스 — 생성된 .md 파일 저장에 사용
import { FileManager } from '../persistence/FileManager.js';

/**
 * .claude/settings.json의 훅 항목 하나를 표현하는 내부 타입.
 * type은 항상 'command'이고, command는 실행할 셸 명령 문자열이다.
 */
interface HookCommandEntry {
	type: 'command';
	command: string;
}

/**
 * .claude/settings.json 파일의 스키마 타입.
 * hooks 필드는 이벤트 이름을 키로, HookCommandEntry 배열을 값으로 갖는다.
 */
interface SettingsSchema {
	permissions?: { allow: string[]; deny: string[] };
	hooks?: Record<string, HookCommandEntry[]>;
	env?: Record<string, string>;
}

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
 * AnalyzerService.generateSkill() 호출 결과를 담는 객체.
 * 생성된 스킬 파일의 절대 경로와 파일 내용을 포함한다.
 */
export interface SkillAnalysisResult {
	/** 생성된 스킬 .md 파일의 절대 경로 */
	filePath: string;
	/** 파일에 기록된 Markdown 내용 */
	content: string;
}

/**
 * AnalyzerService.generateMcpServerSpec() 호출 결과를 담는 객체.
 * 생성된 MCP 서버 스펙 파일의 절대 경로와 파일 내용을 포함한다.
 */
export interface McpServerSpecResult {
	/** 생성된 MCP 서버 스펙 .json 파일의 절대 경로 */
	filePath: string;
	/** 파일에 기록된 JSON 내용 */
	content: string;
}

/**
 * AnalyzerService.generateSubAgent() 호출 결과를 담는 객체.
 * 생성된 서브에이전트 파일의 절대 경로와 파일 내용을 포함한다.
 */
export interface SubAgentAnalysisResult {
	/** 생성된 서브에이전트 .md 파일의 절대 경로 */
	filePath: string;
	/** 파일에 기록된 Markdown 내용 */
	content: string;
}

/**
 * AnalyzerService.generateHookEntry() 호출 결과를 담는 객체.
 * 훅이 등록된 settings.json 경로, 이벤트 이름, 셸 명령을 포함한다.
 */
export interface HookEntryResult {
	/** 훅 설정이 기록된 settings.json 파일의 절대 경로 */
	settingsPath: string;
	/** 훅이 등록된 이벤트 이름 (예: "pre-tool-use", "post-tool-use") */
	event: string;
	/** 이벤트 발생 시 실행할 셸 명령 문자열 */
	command: string;
}

/**
 * CLI 에이전트(sub-agent)를 통해 요구사항을 분석하고 결과물(.md 파일)을 생성하는 서비스.
 *
 * F-008: 커맨드 .md 파일 생성 (.claude/commands/)
 * F-009: 스킬 .md 파일 생성 (.claude/skills/)
 * F-010: MCP 서버 스펙 .json 파일 생성 (지정 디렉토리)
 * F-011: 훅 설정 항목 생성 (.claude/settings.json의 hooks 섹션)
 * F-012: 서브에이전트 .md 파일 생성 (.claude/agents/<에이전트-이름>.md)
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
		const commandName = this._extractName(content);
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
	 * Markdown 형식의 요구사항 입력을 받아 CLI 에이전트(sub-agent)를 통해
	 * 스킬 .md 파일을 지정된 디렉토리에 생성한다.
	 *
	 * F-009: CLI 에이전트가 stdout으로 출력한 Markdown(YAML frontmatter 포함)을
	 * 파싱하여 name 필드를 스킬 이름으로 사용하고,
	 * skillsDir/<스킬-이름>.md 경로에 파일을 생성한다.
	 *
	 * 에이전트 출력 형식 예시:
	 * ```
	 * ---
	 * name: my-skill
	 * description: 스킬 설명
	 * ---
	 *
	 * ## 트리거 조건
	 * ...
	 *
	 * ## 동작 설명
	 * ...
	 * ```
	 *
	 * @param markdownInput - 스킬을 설명하는 Markdown 형식의 요구사항 문자열
	 * @param skillsDir - 생성될 파일을 저장할 디렉토리 절대 경로 (통상 .claude/skills/)
	 * @returns 생성된 파일 경로와 내용을 담은 결과 객체
	 * @throws CLI 에이전트 출력에서 스킬 이름을 추출할 수 없으면 Error를 던진다
	 */
	public async generateSkill(
		markdownInput: string,
		skillsDir: string,
	): Promise<SkillAnalysisResult> {
		// CLI 에이전트에게 전달할 프롬프트 구성
		const prompt = this._buildSkillPrompt(markdownInput);

		// CLI 에이전트(sub-agent) 호출 — stdout 청크를 배열로 수집
		const stdoutChunks: string[] = [];
		await this._runner.invoke(
			prompt,
			(chunk) => stdoutChunks.push(chunk),
			undefined,
		);

		// 수집된 stdout 전체를 파일 내용으로 사용
		const content = stdoutChunks.join('');

		// YAML frontmatter에서 스킬 이름 추출
		const skillName = this._extractName(content);
		if (skillName === null) {
			throw new Error(
				'CLI 에이전트 출력에서 스킬 이름(name 필드)을 추출할 수 없습니다. ' +
				'에이전트 출력이 YAML frontmatter(name: <이름>)를 포함해야 합니다.',
			);
		}

		// 파일 저장 경로: skillsDir/<스킬-이름>.md
		const filePath = path.join(skillsDir, `${skillName}.md`);

		// FileManager를 통해 파일 생성
		await this._fileManager.create(filePath, content);

		return { filePath, content };
	}

	/**
	 * Markdown 형식의 요구사항 입력을 받아 CLI 에이전트(sub-agent)를 통해
	 * MCP 서버 스펙 .json 파일을 지정된 디렉토리에 생성한다.
	 *
	 * F-010: CLI 에이전트가 stdout으로 출력한 JSON을 파싱하여
	 * serverName 필드를 파일 이름으로 사용하고,
	 * outputDir/<서버-이름>.json 경로에 파일을 생성한다.
	 *
	 * 에이전트 출력 형식 예시:
	 * ```json
	 * {
	 *   "serverName": "my-mcp-server",
	 *   "command": "node",
	 *   "args": ["server.js"],
	 *   "description": "서버 설명"
	 * }
	 * ```
	 *
	 * @param markdownInput - MCP 서버를 설명하는 Markdown 형식의 요구사항 문자열
	 * @param outputDir - 생성될 파일을 저장할 디렉토리 절대 경로
	 * @returns 생성된 파일 경로와 내용을 담은 결과 객체
	 * @throws CLI 에이전트 출력에서 serverName 필드를 추출할 수 없으면 Error를 던진다
	 */
	public async generateMcpServerSpec(
		markdownInput: string,
		outputDir: string,
	): Promise<McpServerSpecResult> {
		// CLI 에이전트에게 전달할 프롬프트 구성
		const prompt = this._buildMcpServerSpecPrompt(markdownInput);

		// CLI 에이전트(sub-agent) 호출 — stdout 청크를 배열로 수집
		const stdoutChunks: string[] = [];
		await this._runner.invoke(
			prompt,
			(chunk) => stdoutChunks.push(chunk),
			undefined,
		);

		// 수집된 stdout 전체를 파일 내용으로 사용
		const content = stdoutChunks.join('');

		// JSON에서 serverName 필드 추출
		const serverName = this._extractServerName(content);
		if (serverName === null) {
			throw new Error(
				'CLI 에이전트 출력에서 serverName 필드를 추출할 수 없습니다. ' +
				'에이전트 출력이 JSON 형식이며 "serverName" 필드를 포함해야 합니다.',
			);
		}

		// 파일 저장 경로: outputDir/<서버-이름>.json
		const filePath = path.join(outputDir, `${serverName}.json`);

		// FileManager를 통해 파일 생성
		await this._fileManager.create(filePath, content);

		return { filePath, content };
	}

	/**
	 * Markdown 형식의 요구사항 입력을 받아 CLI 에이전트(sub-agent)를 통해
	 * 서브에이전트 .md 파일을 지정된 디렉토리에 생성한다.
	 *
	 * F-012: CLI 에이전트가 stdout으로 출력한 Markdown(YAML frontmatter 포함)을
	 * 파싱하여 name 필드를 서브에이전트 이름으로 사용하고,
	 * agentsDir/<에이전트-이름>.md 경로에 파일을 생성한다.
	 *
	 * 에이전트 출력 형식 예시:
	 * ```
	 * ---
	 * name: my-agent
	 * description: 에이전트 역할 설명 (언제 호출해야 하는지 기술)
	 * tools: Read, Edit, Bash
	 * ---
	 *
	 * # my-agent
	 *
	 * ## 역할
	 * <에이전트의 역할과 목적>
	 *
	 * ## 사용 도구
	 * <에이전트가 사용할 수 있는 도구 목록>
	 *
	 * ## 행동 규칙
	 * <에이전트가 준수해야 할 행동 규칙>
	 * ```
	 *
	 * @param markdownInput - 서브에이전트를 설명하는 Markdown 형식의 요구사항 문자열
	 * @param agentsDir - 생성될 파일을 저장할 디렉토리 절대 경로 (통상 .claude/agents/)
	 * @returns 생성된 파일 경로와 내용을 담은 결과 객체
	 * @throws CLI 에이전트 출력에서 에이전트 이름을 추출할 수 없으면 Error를 던진다
	 */
	public async generateSubAgent(
		markdownInput: string,
		agentsDir: string,
	): Promise<SubAgentAnalysisResult> {
		// CLI 에이전트에게 전달할 프롬프트 구성
		const prompt = this._buildSubAgentPrompt(markdownInput);

		// CLI 에이전트(sub-agent) 호출 — stdout 청크를 배열로 수집
		const stdoutChunks: string[] = [];
		await this._runner.invoke(
			prompt,
			(chunk) => stdoutChunks.push(chunk),
			undefined,
		);

		// 수집된 stdout 전체를 파일 내용으로 사용
		const content = stdoutChunks.join('');

		// YAML frontmatter에서 에이전트 이름 추출
		const agentName = this._extractName(content);
		if (agentName === null) {
			throw new Error(
				'CLI 에이전트 출력에서 에이전트 이름(name 필드)을 추출할 수 없습니다. ' +
				'에이전트 출력이 YAML frontmatter(name: <이름>)를 포함해야 합니다.',
			);
		}

		// 파일 저장 경로: agentsDir/<에이전트-이름>.md
		const filePath = path.join(agentsDir, `${agentName}.md`);

		// FileManager를 통해 파일 생성
		await this._fileManager.create(filePath, content);

		return { filePath, content };
	}

	/**
	 * Markdown 형식의 요구사항 입력을 받아 CLI 에이전트(sub-agent)를 통해
	 * 훅 설정 항목을 .claude/settings.json의 hooks 섹션에 추가한다.
	 *
	 * F-011: CLI 에이전트가 stdout으로 출력한 JSON을 파싱하여
	 * event(훅 이벤트 이름)와 command(셸 명령) 필드를 추출하고,
	 * 지정된 settings.json 파일의 hooks 섹션에 병합한다.
	 *
	 * 에이전트 출력 형식 예시:
	 * ```json
	 * {
	 *   "event": "pre-tool-use",
	 *   "command": "echo 'pre-tool-use hook'"
	 * }
	 * ```
	 *
	 * settings.json 훅 섹션 결과 예시:
	 * ```json
	 * {
	 *   "hooks": {
	 *     "pre-tool-use": [{"type": "command", "command": "echo 'pre-tool-use hook'"}]
	 *   }
	 * }
	 * ```
	 *
	 * @param markdownInput - 훅을 설명하는 Markdown 형식의 요구사항 문자열
	 * @param settingsPath - 훅을 추가할 settings.json 파일의 절대 경로
	 * @returns 이벤트 이름, 셸 명령, 설정 파일 경로를 담은 결과 객체
	 * @throws CLI 에이전트 출력에서 event 또는 command 필드를 추출할 수 없으면 Error를 던진다
	 * @throws settings.json 파일이 존재하지 않으면 Error를 던진다
	 */
	public async generateHookEntry(
		markdownInput: string,
		settingsPath: string,
	): Promise<HookEntryResult> {
		// CLI 에이전트에게 전달할 프롬프트 구성
		const prompt = this._buildHookEntryPrompt(markdownInput);

		// CLI 에이전트(sub-agent) 호출 — stdout 청크를 배열로 수집
		const stdoutChunks: string[] = [];
		await this._runner.invoke(
			prompt,
			(chunk) => stdoutChunks.push(chunk),
			undefined,
		);

		// 수집된 stdout 전체를 JSON으로 파싱할 대상 문자열로 사용
		const output = stdoutChunks.join('');

		// JSON에서 event와 command 필드 추출
		const event = this._extractHookEvent(output);
		if (event === null) {
			throw new Error(
				'CLI 에이전트 출력에서 event 필드를 추출할 수 없습니다. ' +
				'에이전트 출력이 JSON 형식이며 "event" 필드를 포함해야 합니다.',
			);
		}

		const command = this._extractHookCommand(output);
		if (command === null) {
			throw new Error(
				'CLI 에이전트 출력에서 command 필드를 추출할 수 없습니다. ' +
				'에이전트 출력이 JSON 형식이며 "command" 필드를 포함해야 합니다.',
			);
		}

		// 기존 settings.json 내용을 읽어 JSON 파싱
		const rawSettings = await this._fileManager.read(settingsPath);
		const settings: SettingsSchema = JSON.parse(rawSettings) as SettingsSchema;

		// hooks 섹션이 없으면 빈 객체로 초기화
		if (!settings.hooks) {
			settings.hooks = {};
		}

		// 해당 이벤트의 훅 배열이 없으면 빈 배열로 초기화
		if (!settings.hooks[event]) {
			settings.hooks[event] = [];
		}

		// 새 훅 항목을 해당 이벤트 배열에 추가
		settings.hooks[event].push({ type: 'command', command });

		// 수정된 settings 객체를 JSON 문자열로 직렬화 (들여쓰기 2칸)
		const updatedContent = JSON.stringify(settings, null, 2);

		// FileManager.update()를 통해 settings.json 덮어쓰기
		await this._fileManager.update(settingsPath, updatedContent);

		return { settingsPath, event, command };
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
	 * CLI 에이전트에게 전달할 스킬 생성 프롬프트를 구성한다.
	 * 에이전트는 YAML frontmatter(name 필드 포함), 트리거 조건, 동작 설명 Markdown을
	 * stdout으로 출력해야 한다.
	 *
	 * @param markdownInput - 사용자가 입력한 요구사항 Markdown 문자열
	 * @returns CLI 에이전트에게 전달할 프롬프트 문자열
	 */
	private _buildSkillPrompt(markdownInput: string): string {
		return [
			'다음 요구사항을 분석하여 Claude Code 스킬 파일을 생성하세요.',
			'',
			'출력 형식은 반드시 YAML frontmatter를 포함한 Markdown이어야 합니다:',
			'',
			'---',
			'name: <스킬-이름> (영문 소문자와 하이픈만 허용)',
			'description: <스킬 한 줄 설명>',
			'---',
			'',
			'## 트리거 조건',
			'<이 스킬이 실행되어야 하는 조건이나 상황>',
			'',
			'## 동작 설명',
			'<스킬이 수행해야 할 동작과 절차>',
			'',
			'---',
			'',
			'요구사항:',
			markdownInput,
		].join('\n');
	}

	/**
	 * CLI 에이전트에게 전달할 MCP 서버 스펙 생성 프롬프트를 구성한다.
	 * 에이전트는 serverName, command, args, description 등의 필드를 포함한
	 * JSON 형식으로 stdout에 출력해야 한다.
	 *
	 * @param markdownInput - 사용자가 입력한 요구사항 Markdown 문자열
	 * @returns CLI 에이전트에게 전달할 프롬프트 문자열
	 */
	private _buildMcpServerSpecPrompt(markdownInput: string): string {
		return [
			'다음 요구사항을 분석하여 MCP(Model Context Protocol) 서버 스펙 파일을 생성하세요.',
			'',
			'출력 형식은 반드시 아래 필드를 포함하는 JSON이어야 합니다:',
			'',
			'{',
			'  "serverName": "<서버-이름> (영문 소문자, 숫자, 하이픈만 허용)",',
			'  "command": "<서버 실행 명령 (예: node, python, npx)>",',
			'  "args": ["<실행 인자 배열>"],',
			'  "description": "<서버 한 줄 설명>"',
			'}',
			'',
			'JSON 이외의 텍스트는 출력하지 마십시오.',
			'',
			'요구사항:',
			markdownInput,
		].join('\n');
	}

	/**
	 * CLI 에이전트에게 전달할 서브에이전트 파일 생성 프롬프트를 구성한다.
	 * 에이전트는 YAML frontmatter(name, description, tools 필드 포함),
	 * 역할 설명, 사용 도구, 행동 규칙 섹션을 포함한 Markdown을 stdout으로 출력해야 한다.
	 *
	 * @param markdownInput - 사용자가 입력한 요구사항 Markdown 문자열
	 * @returns CLI 에이전트에게 전달할 프롬프트 문자열
	 */
	private _buildSubAgentPrompt(markdownInput: string): string {
		return [
			'다음 요구사항을 분석하여 Claude Code 서브에이전트(specialist agent) 파일을 생성하세요.',
			'',
			'출력 형식은 반드시 YAML frontmatter를 포함한 Markdown이어야 합니다:',
			'',
			'---',
			'name: <에이전트-이름> (영문 소문자와 하이픈만 허용)',
			'description: <이 에이전트를 언제 호출해야 하는지 설명하는 한 줄 문자열>',
			'tools: <에이전트가 사용할 수 있는 도구 목록 (쉼표 구분, 예: Read, Edit, Bash)>',
			'---',
			'',
			'# <에이전트 이름>',
			'',
			'## 역할',
			'<에이전트의 역할과 목적>',
			'',
			'## 사용 도구',
			'<에이전트가 사용할 수 있는 도구와 그 용도>',
			'',
			'## 행동 규칙',
			'<에이전트가 반드시 준수해야 할 행동 규칙>',
			'',
			'---',
			'',
			'요구사항:',
			markdownInput,
		].join('\n');
	}

	/**
	 * CLI 에이전트에게 전달할 훅 설정 항목 생성 프롬프트를 구성한다.
	 * 에이전트는 event(훅 이벤트 이름)와 command(셸 명령) 필드를 포함한
	 * JSON 형식으로 stdout에 출력해야 한다.
	 *
	 * @param markdownInput - 사용자가 입력한 요구사항 Markdown 문자열
	 * @returns CLI 에이전트에게 전달할 프롬프트 문자열
	 */
	private _buildHookEntryPrompt(markdownInput: string): string {
		return [
			'다음 요구사항을 분석하여 Claude Code 훅 설정 항목을 생성하세요.',
			'',
			'출력 형식은 반드시 아래 두 필드를 포함하는 JSON이어야 합니다:',
			'',
			'{',
			'  "event": "<훅 이벤트 이름 (예: pre-tool-use, post-tool-use, pre-compact, stop)>",',
			'  "command": "<이벤트 발생 시 실행할 셸 명령>"',
			'}',
			'',
			'JSON 이외의 텍스트는 출력하지 마십시오.',
			'',
			'요구사항:',
			markdownInput,
		].join('\n');
	}

	/**
	 * CLI 에이전트가 출력한 JSON 문자열에서 event 필드 값을 추출한다.
	 * generateHookEntry()에서 훅 이벤트 이름 결정에 사용한다.
	 * JSON.parse를 우선 시도하고 실패 시 정규식으로 대체한다.
	 *
	 * @param content - CLI 에이전트가 stdout으로 출력한 전체 JSON 문자열
	 * @returns 추출된 event 값. 없으면 null 반환.
	 */
	private _extractHookEvent(content: string): string | null {
		// JSON.parse로 event 필드 추출 시도 (이스케이프 문자 안전 처리)
		try {
			const parsed = JSON.parse(content) as Record<string, unknown>;
			if (typeof parsed['event'] === 'string' && parsed['event'].length > 0) {
				return parsed['event'];
			}
		} catch {
			// 파싱 실패 시 정규식으로 대체
		}
		// 정규식으로 "event" 키 값 추출 (이스케이프 시퀀스 포함 처리)
		const match = /"event"\s*:\s*"((?:[^"\\]|\\.)+)"/.exec(content);
		if (!match || !match[1]) {
			return null;
		}
		return match[1].trim();
	}

	/**
	 * CLI 에이전트가 출력한 JSON 문자열에서 command 필드 값을 추출한다.
	 * generateHookEntry()에서 실행할 셸 명령 결정에 사용한다.
	 * JSON.parse를 우선 시도하고 실패 시 정규식으로 대체한다.
	 *
	 * @param content - CLI 에이전트가 stdout으로 출력한 전체 JSON 문자열
	 * @returns 추출된 command 값. 없으면 null 반환.
	 */
	private _extractHookCommand(content: string): string | null {
		// JSON.parse로 command 필드 추출 시도 (이스케이프 문자 안전 처리)
		try {
			const parsed = JSON.parse(content) as Record<string, unknown>;
			if (typeof parsed['command'] === 'string' && parsed['command'].length > 0) {
				return parsed['command'];
			}
		} catch {
			// 파싱 실패 시 정규식으로 대체
		}
		// 정규식으로 "command" 키 값 추출 (이스케이프 시퀀스 포함 처리)
		const match = /"command"\s*:\s*"((?:[^"\\]|\\.)+)"/.exec(content);
		if (!match || !match[1]) {
			return null;
		}
		return match[1].trim();
	}

	/**
	 * CLI 에이전트가 출력한 JSON 문자열에서 serverName 필드 값을 추출한다.
	 * generateMcpServerSpec()에서 파일 이름 결정에 사용한다.
	 *
	 * @param content - CLI 에이전트가 stdout으로 출력한 전체 JSON 문자열
	 * @returns 추출된 serverName 값. 없으면 null 반환.
	 */
	private _extractServerName(content: string): string | null {
		// JSON에서 "serverName" 키 값을 정규식으로 추출 (파싱 실패 대비 정규식 우선 사용)
		const nameMatch = /"serverName"\s*:\s*"([^"]+)"/.exec(content);
		if (!nameMatch || !nameMatch[1]) {
			return null;
		}
		// 앞뒤 공백 제거 후 반환
		return nameMatch[1].trim();
	}

	/**
	 * CLI 에이전트가 출력한 Markdown 문자열에서
	 * YAML frontmatter의 name 필드 값을 추출한다.
	 * generateCommand(), generateSkill() 등에서 공통으로 사용한다.
	 *
	 * @param content - CLI 에이전트가 stdout으로 출력한 전체 Markdown 문자열
	 * @returns 추출된 이름 문자열. 없으면 null 반환.
	 */
	private _extractName(content: string): string | null {
		// YAML frontmatter에서 "name: <값>" 패턴을 멀티라인 정규식으로 추출
		const nameMatch = /^name:\s*(.+)$/m.exec(content);
		if (!nameMatch || !nameMatch[1]) {
			return null;
		}
		// 앞뒤 공백 제거 후 반환
		return nameMatch[1].trim();
	}
}
