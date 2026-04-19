// FileManager 가져오기 — 파일 읽기 의존성 주입
import { FileManager } from '../persistence/FileManager.js';

/**
 * PLAN.md에서 파싱한 개별 단계 항목.
 * 체크박스(`- [x]` / `- [ ]`) 또는 일반 불릿 항목(`- `)을 나타낸다.
 */
export interface PlanStep {
	/** 단계 설명 텍스트 — 마커(`- [x]`, `- [ ]`, `- `) 제거 후의 순수 텍스트 */
	text: string;
	/** 완료 여부 — `- [x]` 항목이면 true, 그 외 모두 false */
	completed: boolean;
}

/**
 * PLAN.md에서 `##` 제목을 기준으로 묶인 섹션.
 * 섹션 아래 위치한 단계 목록(steps)을 함께 보관한다.
 */
export interface PlanSection {
	/** 섹션 제목 — `##` 접두어를 제거한 순수 제목 문자열 */
	title: string;
	/** 해당 섹션에 속한 단계 목록 (빈 경우 빈 배열) */
	steps: PlanStep[];
}

/**
 * PlanService.loadPlan() 반환 타입.
 * 원본 파일 내용과 파싱된 섹션 목록을 함께 제공한다.
 */
export interface PlanData {
	/** 원본 PLAN.md 파일 내용 (렌더링 폴백 또는 디버그 용도) */
	rawContent: string;
	/** 파싱된 섹션 목록 — 섹션이 없으면 빈 배열 */
	sections: PlanSection[];
}

/**
 * PLAN.md 파일을 읽어 PlanData로 파싱하는 서비스 클래스.
 *
 * F-013: PlanView에 표시할 플랜 단계 목록을 파싱하여 제공한다.
 * FileManager를 생성자에서 DI로 주입받아 파일 I/O를 처리하므로
 * 단위 테스트 시 Mock FileManager로 교체 가능하다.
 */
export class PlanService {
	/** 파일 읽기를 담당하는 FileManager 인스턴스 */
	private readonly _fileManager: FileManager;

	/**
	 * @param fileManager - 파일 I/O를 처리하는 FileManager 인스턴스
	 */
	public constructor(fileManager: FileManager) {
		this._fileManager = fileManager;
	}

	/**
	 * 지정된 경로의 PLAN.md 파일을 읽고 PlanData로 파싱하여 반환한다.
	 *
	 * F-013: PlanView 렌더링에 필요한 섹션·단계 데이터를 제공한다.
	 *
	 * @param planFilePath - PLAN.md 파일의 절대 경로
	 * @returns 파싱된 PlanData (rawContent + sections 포함)
	 * @throws 파일이 존재하지 않거나 읽기 실패 시 vscode.FileSystemError가 발생한다
	 */
	public async loadPlan(planFilePath: string): Promise<PlanData> {
		// FileManager.read()로 파일 내용을 UTF-8 문자열로 읽기
		const rawContent = await this._fileManager.read(planFilePath);
		// Markdown 파싱 — 섹션과 단계 추출
		const sections = this._parseContent(rawContent);
		return { rawContent, sections };
	}

	/**
	 * Markdown 문자열에서 `##` 섹션과 `- [x]` / `- [ ]` 단계를 파싱한다.
	 *
	 * 파싱 규칙:
	 * - `## 제목` → 새 섹션 시작 (`#` 단일 제목은 섹션으로 취급하지 않음)
	 * - `- [x] 텍스트` → 완료된 단계 (completed: true)
	 * - `- [ ] 텍스트` → 미완료 단계 (completed: false)
	 * - `- 텍스트` (체크박스 없음) → 미완료 단계로 처리 (completed: false)
	 * - 섹션에 속하지 않는 단계 항목은 무시한다
	 *
	 * @param content - PLAN.md 파일 원본 내용
	 * @returns 파싱된 PlanSection 배열
	 */
	private _parseContent(content: string): PlanSection[] {
		const lines = content.split('\n');
		const sections: PlanSection[] = [];
		// 현재 처리 중인 섹션 — null이면 아직 섹션이 시작되지 않은 상태
		let currentSection: PlanSection | null = null;

		for (const line of lines) {
			// `##` 제목 라인 → 새 섹션 시작
			const sectionMatch = line.match(/^##\s+(.+)/);
			if (sectionMatch) {
				currentSection = { title: sectionMatch[1].trim(), steps: [] };
				sections.push(currentSection);
				continue;
			}

			// 섹션이 시작되지 않았으면 단계 파싱 불필요
			if (!currentSection) {
				continue;
			}

			// `- [x]` 완료 단계 (대소문자 무시)
			const completedMatch = line.match(/^-\s+\[x\]\s+(.+)/i);
			if (completedMatch) {
				currentSection.steps.push({ text: completedMatch[1].trim(), completed: true });
				continue;
			}

			// `- [ ]` 미완료 단계
			const pendingMatch = line.match(/^-\s+\[\s\]\s+(.+)/);
			if (pendingMatch) {
				currentSection.steps.push({ text: pendingMatch[1].trim(), completed: false });
				continue;
			}

			// `- 텍스트` 일반 불릿 항목 (체크박스 없음) → 미완료로 처리
			const bulletMatch = line.match(/^-\s+(?!\[)(.+)/);
			if (bulletMatch) {
				currentSection.steps.push({ text: bulletMatch[1].trim(), completed: false });
			}
		}

		return sections;
	}
}
