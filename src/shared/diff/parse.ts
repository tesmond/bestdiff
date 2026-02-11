import { normalizeLineEndings } from "./normalize";
import type { DiffFile, DiffParseResult, DiffHunk, DiffLine } from "./model";

const DIFF_HEADER = /^diff --git a\/(.+?) b\/(.+)$/;
const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

function ensureStatus(file: DiffFile): void {
	if (file.oldPath === null && file.newPath !== null) {
		file.status = "added";
		return;
	}
	if (file.newPath === null && file.oldPath !== null) {
		file.status = "deleted";
		return;
	}
	if (!file.status) {
		file.status = "modified";
	}
}

export function parseUnifiedDiff(rawDiff: string): DiffParseResult {
	const lines = normalizeLineEndings(rawDiff).split("\n");
	const files: DiffFile[] = [];
	let currentFile: DiffFile | null = null;
	let currentHunk: DiffHunk | null = null;
	let oldLine = 0;
	let newLine = 0;

	for (const line of lines) {
		const diffMatch = DIFF_HEADER.exec(line);
		if (diffMatch) {
			if (currentFile) {
				ensureStatus(currentFile);
			}
			currentFile = {
				oldPath: diffMatch[1],
				newPath: diffMatch[2],
				status: "modified",
				hunks: [],
			};
			files.push(currentFile);
			currentHunk = null;
			continue;
		}

		if (!currentFile) {
			continue;
		}

		if (line.startsWith("new file mode")) {
			currentFile.status = "added";
			continue;
		}

		if (line.startsWith("deleted file mode")) {
			currentFile.status = "deleted";
			continue;
		}

		if (line.startsWith("--- ")) {
			const path = line.slice(4).trim();
			currentFile.oldPath = path === "/dev/null" ? null : path.replace(/^a\//, "");
			continue;
		}

		if (line.startsWith("+++ ")) {
			const path = line.slice(4).trim();
			currentFile.newPath = path === "/dev/null" ? null : path.replace(/^b\//, "");
			continue;
		}

		const hunkMatch = HUNK_HEADER.exec(line);
		if (hunkMatch) {
			const oldStart = Number(hunkMatch[1]);
			const oldLines = Number(hunkMatch[2] ?? 1);
			const newStart = Number(hunkMatch[3]);
			const newLines = Number(hunkMatch[4] ?? 1);

			currentHunk = {
				header: line,
				oldStart,
				oldLines,
				newStart,
				newLines,
				lines: [],
			};
			currentFile.hunks.push(currentHunk);
			oldLine = oldStart;
			newLine = newStart;
			continue;
		}

		if (!currentHunk) {
			continue;
		}

		if (line.startsWith("\\ No newline at end of file")) {
			continue;
		}

		if (line.startsWith("+")) {
			if (line.startsWith("+++")) {
				continue;
			}
			const diffLine: DiffLine = {
				type: "added",
				content: line.slice(1),
				newLineNumber: newLine,
			};
			newLine += 1;
			currentHunk.lines.push(diffLine);
			continue;
		}

		if (line.startsWith("-")) {
			if (line.startsWith("---")) {
				continue;
			}
			const diffLine: DiffLine = {
				type: "removed",
				content: line.slice(1),
				oldLineNumber: oldLine,
			};
			oldLine += 1;
			currentHunk.lines.push(diffLine);
			continue;
		}

		if (line.startsWith(" ")) {
			const diffLine: DiffLine = {
				type: "context",
				content: line.slice(1),
				oldLineNumber: oldLine,
				newLineNumber: newLine,
			};
			oldLine += 1;
			newLine += 1;
			currentHunk.lines.push(diffLine);
		}
	}

	for (const file of files) {
		ensureStatus(file);
	}

	return { files };
}
