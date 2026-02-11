import { normalizeLineEndings } from "./normalize";
import type { DiffSource, TwoFileDiffOptions } from "./types";

export class GitDiffSource implements DiffSource {
	private rawDiff: string;

	constructor(rawDiff: string) {
		this.rawDiff = rawDiff;
	}

	async getRawDiff(): Promise<string> {
		return normalizeLineEndings(this.rawDiff);
	}
}

export class PatchFileDiffSource implements DiffSource {
	private patchContents: string;

	constructor(patchContents: string) {
		this.patchContents = patchContents;
	}

	async getRawDiff(): Promise<string> {
		return normalizeLineEndings(this.patchContents);
	}
}

export class TwoFileDiffSource implements DiffSource {
	private options: TwoFileDiffOptions;

	constructor(options: TwoFileDiffOptions) {
		this.options = options;
	}

	async getRawDiff(): Promise<string> {
		const { filePath, oldContent, newContent } = this.options;
		const normalizedOld = normalizeLineEndings(oldContent).replace(/\n/g, "\\n");
		const normalizedNew = normalizeLineEndings(newContent).replace(/\n/g, "\\n");

		return [
			`diff --git a/${filePath} b/${filePath}`,
			`--- a/${filePath}`,
			`+++ b/${filePath}`,
			"@@ -1 +1 @@",
			`- ${normalizedOld}`,
			`+ ${normalizedNew}`,
		].join("\n");
	}
}
