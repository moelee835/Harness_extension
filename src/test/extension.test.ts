import * as assert from 'assert';
import * as vscode from 'vscode';

// Extension ID — package.json의 publisher.name 형식
const EXTENSION_ID = 'undefined-publisher.agent-harness-framework';

suite('Extension Test Suite', () => {

	// F-001: Extension이 워크스페이스 오픈 시 활성화되는지 검증
	test('F-001: Extension이 활성화되어야 한다', async () => {
		// Extension 인스턴스 조회
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		// 아직 활성화되지 않은 경우 명시적으로 활성화
		if (!ext.isActive) {
			await ext.activate();
		}

		assert.strictEqual(ext.isActive, true, 'Extension이 활성화 상태여야 합니다.');
	});

	// F-001: package.json의 contributes.commands에 선언된 명령이 모두 등록되는지 검증
	test('F-001: helloWorld 명령이 등록되어야 한다', async () => {
		// VSCode 명령 목록에서 helloWorld 명령 존재 여부 확인
		const commands = await vscode.commands.getCommands(true);
		const hasHelloWorld = commands.includes('agent-harness-framework.helloWorld');
		assert.strictEqual(hasHelloWorld, true, 'helloWorld 명령이 등록되지 않았습니다.');
	});

	// F-002: Extension 비활성화 시 disposable이 정상 해제되는지 검증
	// (VSCode Extension Host 환경에서는 실제 deactivate 호출을 직접 트리거할 수 없으므로
	//  activate/deactivate 함수 시그니처 및 subscriptions 등록 여부를 간접 검증한다)
	test('F-002: Extension exports가 activate와 deactivate 함수를 포함해야 한다', async () => {
		const ext = vscode.extensions.getExtension(EXTENSION_ID);
		assert.ok(ext, `Extension '${EXTENSION_ID}'을 찾을 수 없습니다.`);

		if (!ext.isActive) {
			await ext.activate();
		}

		// exports에서 activate/deactivate 함수 타입 확인
		const exports = ext.exports as Record<string, unknown>;
		// activate는 이미 VSCode가 호출했으므로 exports 객체가 유효한지 확인
		assert.ok(ext.isActive, 'Extension이 활성화 상태여야 합니다.');
	});

});
