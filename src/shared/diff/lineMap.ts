import type { DiffFile, DiffHunk, DiffLine } from "./model";

export type LineMapEntry = {
	oldLineNumber: number | null;
	newLineNumber: number | null;
	lineType: DiffLine["type"];
};

export type LineMap = {
	entries: LineMapEntry[];
};

function addEntry(entries: LineMapEntry[], line: DiffLine): void {
	entries.push({
		oldLineNumber: line.oldLineNumber ?? null,
		newLineNumber: line.newLineNumber ?? null,
		lineType: line.type,
	});
}

function mapHunk(hunk: DiffHunk, entries: LineMapEntry[]): void {
	for (const line of hunk.lines) {
		addEntry(entries, line);
	}
}

export function buildLineMap(file: DiffFile): LineMap {
	const entries: LineMapEntry[] = [];
	for (const hunk of file.hunks) {
		mapHunk(hunk, entries);
	}
	return { entries };
}
