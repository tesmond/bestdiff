import { describe, expect, it } from "vitest";
import type { DiffFile } from "./model";
import { buildLineMap } from "./lineMap";

const file: DiffFile = {
	oldPath: "src/example.ts",
	newPath: "src/example.ts",
	status: "modified",
	hunks: [
		{
			header: "@@ -1,3 +1,4 @@",
			oldStart: 1,
			oldLines: 3,
			newStart: 1,
			newLines: 4,
			lines: [
				{ type: "context", content: "a", oldLineNumber: 1, newLineNumber: 1 },
				{ type: "removed", content: "b", oldLineNumber: 2 },
				{ type: "added", content: "b2", newLineNumber: 2 },
				{ type: "context", content: "c", oldLineNumber: 3, newLineNumber: 3 },
				{ type: "added", content: "d", newLineNumber: 4 },
			],
		},
	],
};

describe("buildLineMap", () => {
	it("maps each diff line to old/new positions", () => {
		const map = buildLineMap(file);

		expect(map.entries).toHaveLength(5);
		expect(map.entries[0]).toEqual({
			oldLineNumber: 1,
			newLineNumber: 1,
			lineType: "context",
		});
		expect(map.entries[1]).toEqual({
			oldLineNumber: 2,
			newLineNumber: null,
			lineType: "removed",
		});
		expect(map.entries[2]).toEqual({
			oldLineNumber: null,
			newLineNumber: 2,
			lineType: "added",
		});
	});
});
