// VSCode Extension API 가져오기 — 파일시스템 접근은 vscode.workspace.fs를 통해 수행한다
import * as vscode from 'vscode';
// Node.js path 모듈 — 부모 디렉토리 경로 추출에 사용
import * as path from 'path';

/**
 * .md 파일의 생성·읽기·수정·삭제·목록 조회를 담당하는 영속성 레이어 클래스.
 *
 * VSCode 가상 파일시스템(vscode.workspace.fs)을 사용하여
 * 원격 또는 가상 워크스페이스에서도 동작할 수 있도록 설계되어 있다.
 *
 * 모든 경로 인자는 절대 경로 문자열로 전달한다.
 * 내부적으로 vscode.Uri.file(path)를 통해 URI로 변환하여 처리한다.
 */
export class FileManager {

	/**
	 * 지정된 절대 경로에 새 .md 파일을 생성한다.
	 *
	 * F-021: FileManager.create(path, content) 호출 시
	 * 파일이 존재하지 않으면 신규 생성하고, 부모 디렉토리가 없으면 Error를 던진다.
	 *
	 * @param filePath - 생성할 파일의 절대 경로
	 * @param content - 파일에 기록할 Markdown 문자열
	 * @throws 부모 디렉토리가 존재하지 않으면 Error를 던진다
	 */
	public async create(filePath: string, content: string): Promise<void> {
		// 부모 디렉토리 경로 추출
		const parentDir = path.dirname(filePath);
		const parentUri = vscode.Uri.file(parentDir);

		// 부모 디렉토리 존재 여부 확인 — 없으면 에러
		try {
			const stat = await vscode.workspace.fs.stat(parentUri);
			// stat.type이 Directory가 아니면 경로가 잘못된 것
			if (stat.type !== vscode.FileType.Directory) {
				throw new Error(`부모 경로가 디렉토리가 아닙니다: ${parentDir}`);
			}
		} catch (err: unknown) {
			// FileSystemError(EntryNotFound) 또는 위에서 던진 Error 모두 재포장하여 전달
			if (err instanceof Error && err.message.startsWith('부모 경로')) {
				throw err;
			}
			throw new Error(`부모 디렉토리가 존재하지 않습니다: ${parentDir}`);
		}

		// 파일 내용을 UTF-8 바이트 배열로 인코딩
		const encoder = new TextEncoder();
		const bytes = encoder.encode(content);

		// vscode.workspace.fs.writeFile로 파일 생성 (이미 존재하면 덮어씀)
		const fileUri = vscode.Uri.file(filePath);
		await vscode.workspace.fs.writeFile(fileUri, bytes);
	}

	/**
	 * 지정된 절대 경로의 .md 파일 내용을 읽어 문자열로 반환한다.
	 *
	 * F-022: FileManager.read(path) 호출 시 파일 내용을 UTF-8 문자열로 반환한다.
	 *
	 * @param filePath - 읽을 파일의 절대 경로
	 * @returns 파일 내용 문자열 (UTF-8)
	 * @throws 파일이 존재하지 않으면 vscode.FileSystemError가 발생한다
	 */
	public async read(filePath: string): Promise<string> {
		const fileUri = vscode.Uri.file(filePath);
		const bytes = await vscode.workspace.fs.readFile(fileUri);
		const decoder = new TextDecoder('utf-8');
		return decoder.decode(bytes);
	}

	/**
	 * 지정된 절대 경로의 .md 파일을 새 내용으로 덮어쓴다.
	 *
	 * F-023: FileManager.update(path, content) 호출 시 기존 파일을 덮어쓴다.
	 *
	 * @param filePath - 덮어쓸 파일의 절대 경로
	 * @param content - 새 파일 내용 (Markdown 문자열)
	 * @throws 파일이 존재하지 않으면 vscode.FileSystemError가 발생한다
	 */
	public async update(filePath: string, content: string): Promise<void> {
		const fileUri = vscode.Uri.file(filePath);
		// 파일 존재 여부 확인
		await vscode.workspace.fs.stat(fileUri);
		// 존재하면 덮어쓰기
		const encoder = new TextEncoder();
		const bytes = encoder.encode(content);
		await vscode.workspace.fs.writeFile(fileUri, bytes);
	}

	/**
	 * 지정된 절대 경로의 .md 파일을 삭제한다.
	 *
	 * F-024: FileManager.delete(path) 호출 시 파일을 영구 삭제한다.
	 *
	 * @param filePath - 삭제할 파일의 절대 경로
	 * @throws 파일이 존재하지 않으면 vscode.FileSystemError가 발생한다
	 */
	public async delete(filePath: string): Promise<void> {
		const fileUri = vscode.Uri.file(filePath);
		await vscode.workspace.fs.delete(fileUri);
	}

	/**
	 * 지정된 절대 경로의 디렉토리에 있는 모든 .md 파일 경로를 반환한다.
	 * 하위 디렉토리는 검색하지 않는다 (비재귀적).
	 *
	 * F-025: FileManager.list(dirPath) 호출 시 해당 디렉토리의 .md 파일 절대 경로 목록을 반환한다.
	 *
	 * @param dirPath - 검색할 디렉토리의 절대 경로
	 * @returns .md 파일 절대 경로 배열 (비재귀, 알파벳 순)
	 * @throws 디렉토리가 존재하지 않으면 vscode.FileSystemError가 발생한다
	 */
	public async list(dirPath: string): Promise<string[]> {
		const dirUri = vscode.Uri.file(dirPath);
		const entries = await vscode.workspace.fs.readDirectory(dirUri);
		return entries
			.filter(([name, type]) => type === vscode.FileType.File && name.endsWith('.md'))
			.map(([name]) => path.join(dirPath, name))
			.sort();
	}
}
