import { describe, expect, it } from "vitest";
import { GitDiffSource, PatchFileDiffSource, TwoFileDiffSource } from "./sources";

const CRLF_DIFF = "diff --git a/a.txt b/a.txt\r\n+hello\r\n";

function expectNormalized(value: string) {
	expect(value).not.toContain("\r");
}

describe("Diff sources", () => {
	it("normalizes line endings for git diff", async () => {
		const source = new GitDiffSource(CRLF_DIFF);
		const raw = await source.getRawDiff();

		expectNormalized(raw);
		expect(raw).toContain("diff --git a/a.txt b/a.txt");
	});

	it("normalizes line endings for patch files", async () => {
		const source = new PatchFileDiffSource("--- a/a.txt\r\n+++ b/a.txt\r\n");
		const raw = await source.getRawDiff();

		expectNormalized(raw);
		expect(raw).toContain("--- a/a.txt");
	});

	it("creates a mock diff for two files", async () => {
		const source = new TwoFileDiffSource({
			filePath: "src/file.txt",
			oldContent: "old line\r\nsecond",
			newContent: "new line\r\nsecond",
		});
		const raw = await source.getRawDiff();

		expectNormalized(raw);
		expect(raw).toContain("diff --git a/src/file.txt b/src/file.txt");
		expect(raw).toContain("- old line\\nsecond");
		expect(raw).toContain("+ new line\\nsecond");
	});
});
