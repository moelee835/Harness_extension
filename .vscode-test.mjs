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
});
