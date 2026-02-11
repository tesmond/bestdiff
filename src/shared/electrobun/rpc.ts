import type { DiffFile } from "../diff/model";

export type FileContents = {
	oldLines: string[];
	newLines: string[];
};

export type WorkspaceDiffPayload = {
	rootPath: string;
	staged: DiffFile[];
	unstaged: DiffFile[];
	fileContents: Record<string, FileContents>;
};

export type BestDiffRPCSchema = {
	bun: {
		requests: {
			openWorkspace: { params?: void; response: WorkspaceDiffPayload | null };
			getWorkspace: { params?: void; response: WorkspaceDiffPayload | null };
		};
		messages: {
			workspaceLoaded: WorkspaceDiffPayload;
			workspaceError: { message: string };
		};
	};
	webview: {
		requests: Record<string, never>;
		messages: Record<string, never>;
	};
};
