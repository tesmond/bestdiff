export type DiffFileStatus = "added" | "modified" | "deleted";

export type DiffLineType = "context" | "added" | "removed";

export type DiffLine = {
	type: DiffLineType;
	content: string;
	oldLineNumber?: number;
	newLineNumber?: number;
};

export type DiffHunk = {
	header: string;
	oldStart: number;
	oldLines: number;
	newStart: number;
	newLines: number;
	lines: DiffLine[];
};

export type DiffFile = {
	oldPath: string | null;
	newPath: string | null;
	status: DiffFileStatus;
	hunks: DiffHunk[];
};

export type DiffParseResult = {
	files: DiffFile[];
};
