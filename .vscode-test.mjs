import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
	files: 'out/test/**/*.test.js',
	// 실행 중인 VSCode와 충돌 방지: 별도 사용자 데이터 디렉토리 + 업데이트 비활성화
	launchArgs: [
		'--user-data-dir', '.vscode-test/test-user-data',
		'--no-sandbox',
		'--disable-updates',
		'--disable-workspace-trust',
	],
	// VSCode 설정 파일 쓰기(config.update) 등 디스크 I/O가 포함된 통합 테스트는
	// 기본 2000ms 타임아웃으로 간헐적 실패가 발생하므로 10초로 늘린다.
	mocha: {
		timeout: 10000,
	},
});
