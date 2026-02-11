import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { DiffFile } from "../../shared/diff/model";
import { SideBySideDiff } from "./SideBySideDiff";

const file: DiffFile = {
	oldPath: "src/sample.ts",
	newPath: "src/sample.ts",
	status: "modified",
	hunks: [
		{
			header: "@@ -1,2 +1,3 @@",
			oldStart: 1,
			oldLines: 2,
			newStart: 1,
			newLines: 3,
			lines: [
					{ type: "context", content: "const alpha = 1;", oldLineNumber: 1, newLineNumber: 1 },
					{ type: "removed", content: "const beta = 2;", oldLineNumber: 2 },
					{ type: "added", content: "const beta = 3;", newLineNumber: 2 },
					{ type: "added", content: "const gamma = 4;", newLineNumber: 3 },
			],
		},
	],
};

describe("SideBySideDiff", () => {
	it("renders line numbers and content in two columns", () => {
		render(<SideBySideDiff file={file} />);

		expect(screen.getByTestId("left-content-1")).toHaveTextContent("const alpha = 1;");
		expect(screen.getByTestId("right-content-1")).toHaveTextContent("const alpha = 1;");
	});

	it("keeps removed lines on the left and added lines on the right", () => {
		render(<SideBySideDiff file={file} />);

		expect(screen.getByTestId("left-content-2")).toHaveTextContent("const beta = 2;");
		expect(screen.getByTestId("right-content-2")).toHaveTextContent("const beta = 3;");
		expect(screen.getByTestId("right-content-3")).toHaveTextContent("const gamma = 4;");
	});

	it("keeps new text on the right for inline updates", () => {
		render(<SideBySideDiff file={file} />);

		expect(screen.getByTestId("right-content-2")).toHaveTextContent("const beta = 3;");
		expect(screen.getByTestId("right-content-2")).not.toHaveTextContent("const beta = 2;");
	});
});
