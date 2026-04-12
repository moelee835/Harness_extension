/**
 * 프로젝트 요구사항 텍스트를 Markdown 형식으로 변환하는 서비스.
 * F-006: 사용자 입력 데이터를 에이전트(CLI)가 소비하기 적합한 Markdown 포맷으로 변환한다.
 *
 * 이 클래스는 VSCode API에 의존하지 않는 순수 TypeScript 클래스이므로
 * 단위 테스트 및 서비스 레이어에서 독립적으로 사용할 수 있다.
 */
export class MarkdownConverter {
	/**
	 * 원시 요구사항 텍스트를 Markdown 문자열로 변환한다.
	 *
	 * 변환 규칙:
	 * - 빈 입력(공백만 있는 경우 포함)은 빈 문자열을 반환한다.
	 * - 앞뒤 공백을 제거(trim)한 후 처리한다.
	 * - '# 프로젝트 요구사항' 제목 하단에 입력 내용을 그대로 배치한다.
	 * - 데이터 손실 없이 모든 입력 내용을 보존한다.
	 *
	 * @param requirement - 사용자가 입력한 프로젝트 요구사항 텍스트
	 * @returns Markdown 형식의 문자열. 빈 입력이면 빈 문자열 반환.
	 */
	public convert(requirement: string): string {
		const trimmed = requirement.trim();

		// 빈 입력은 빈 문자열로 반환 — 불필요한 Markdown 헤딩 생성 방지
		if (!trimmed) {
			return '';
		}

		// 표준 Markdown 구조로 변환: H1 제목 + 빈 줄 + 본문 + 끝 줄바꿈
		return `# 프로젝트 요구사항\n\n${trimmed}\n`;
	}
}
