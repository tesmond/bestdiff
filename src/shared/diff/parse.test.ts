import { describe, expect, it } from "vitest";
import { parseUnifiedDiff } from "./parse";

const MODIFIED_DIFF = [
	"diff --git a/src/a.txt b/src/a.txt",
	"index 123..456 100644",
	"--- a/src/a.txt",
	"+++ b/src/a.txt",
	"@@ -1,2 +1,2 @@",
	"-hello",
	"+hello world",
	" keep",
].join("\n");

const ADDED_DIFF = [
	"diff --git a/src/new.txt b/src/new.txt",
	"new file mode 100644",
	"--- /dev/null",
	"+++ b/src/new.txt",
	"@@ -0,0 +1,2 @@",
	"+first",
	"+second",
].join("\r\n");

const DELETED_DIFF = [
	"diff --git a/src/old.txt b/src/old.txt",
	"deleted file mode 100644",
	"--- a/src/old.txt",
	"+++ /dev/null",
	"@@ -1 +0,0 @@",
	"-old",
].join("\n");

describe("parseUnifiedDiff", () => {
	it("parses modified files with hunks", () => {
		const result = parseUnifiedDiff(MODIFIED_DIFF);

		expect(result.files).toHaveLength(1);
		const file = result.files[0];
		expect(file.status).toBe("modified");
		expect(file.oldPath).toBe("src/a.txt");
		expect(file.newPath).toBe("src/a.txt");
		expect(file.hunks).toHaveLength(1);

		const hunk = file.hunks[0];
		expect(hunk.oldStart).toBe(1);
		expect(hunk.oldLines).toBe(2);
		expect(hunk.newStart).toBe(1);
		expect(hunk.newLines).toBe(2);
		expect(hunk.lines).toHaveLength(3);

		expect(hunk.lines[0]).toMatchObject({
			type: "removed",
			content: "hello",
			oldLineNumber: 1,
		});
		expect(hunk.lines[1]).toMatchObject({
			type: "added",
			content: "hello world",
			newLineNumber: 1,
		});
		expect(hunk.lines[2]).toMatchObject({
			type: "context",
			content: "keep",
			oldLineNumber: 2,
			newLineNumber: 2,
		});
	});

	it("parses added files", () => {
		const result = parseUnifiedDiff(ADDED_DIFF);
		const file = result.files[0];

		expect(file.status).toBe("added");
		expect(file.oldPath).toBeNull();
		expect(file.newPath).toBe("src/new.txt");
		expect(file.hunks[0].lines).toHaveLength(2);
	});

	it("parses deleted files", () => {
		const result = parseUnifiedDiff(DELETED_DIFF);
		const file = result.files[0];

		expect(file.status).toBe("deleted");
		expect(file.oldPath).toBe("src/old.txt");
		expect(file.newPath).toBeNull();
		expect(file.hunks[0].lines[0]).toMatchObject({
			type: "removed",
			content: "old",
			oldLineNumber: 1,
		});
	});
});
