import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { DiffFile } from "../../shared/diff/model";
import { FileListPane } from "./FileListPane";

function makeFile(path: string, status: DiffFile["status"]): DiffFile {
	return {
		oldPath: path,
		newPath: path,
		status,
		hunks: [],
	};
}

describe("FileListPane", () => {
	it("renders staged and unstaged groups", () => {
		render(
			<FileListPane
				staged={[makeFile("src/staged.ts", "modified")]}
				unstaged={[makeFile("src/unstaged.ts", "added")]}
				selectedPath={null}
				onSelectFile={() => undefined}
				comment=""
				onCommentChange={() => undefined}
				onCommit={() => undefined}
				onStage={() => undefined}
				onUnstage={() => undefined}
			/>,
		);

		expect(screen.getByText("Staged Changes")).toBeInTheDocument();
		expect(screen.getByText("Changes")).toBeInTheDocument();
		expect(screen.getByText("src/staged.ts")).toBeInTheDocument();
		expect(screen.getByText("src/unstaged.ts")).toBeInTheDocument();
		expect(screen.getByText("Added")).toBeInTheDocument();
	});

	it("calls onStage when staging files", async () => {
		const user = userEvent.setup();
		const onStage = vi.fn();
		const onUnstage = vi.fn();

		render(
			<FileListPane
				staged={[]}
				unstaged={[makeFile("src/unstaged.ts", "modified")]}
				selectedPath={null}
				onSelectFile={() => undefined}
				comment=""
				onCommentChange={() => undefined}
				onCommit={() => undefined}
				onStage={onStage}
				onUnstage={onUnstage}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /stage src\/unstaged\.ts/i }));
		expect(onStage).toHaveBeenCalledWith("src/unstaged.ts");
	});

	it("calls onUnstage when unstaging files", async () => {
		const user = userEvent.setup();
		const onStage = vi.fn();
		const onUnstage = vi.fn();

		render(
			<FileListPane
				staged={[makeFile("src/staged.ts", "deleted")]}
				unstaged={[]}
				selectedPath={null}
				onSelectFile={() => undefined}
				comment=""
				onCommentChange={() => undefined}
				onCommit={() => undefined}
				onStage={onStage}
				onUnstage={onUnstage}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /unstage src\/staged\.ts/i }));
		expect(onUnstage).toHaveBeenCalledWith("src/staged.ts");
	});

	it("disables commit when no staged files", () => {
		render(
			<FileListPane
				staged={[]}
				unstaged={[makeFile("src/unstaged.ts", "modified")]}
				selectedPath={null}
				onSelectFile={() => undefined}
				comment=""
				onCommentChange={() => undefined}
				onCommit={() => undefined}
				onStage={() => undefined}
				onUnstage={() => undefined}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /commit staged changes/i }),
		).toBeDisabled();
	});

	it("captures commit message input", async () => {
		const user = userEvent.setup();
		const onCommentChange = vi.fn();

		render(
			<FileListPane
				staged={[makeFile("src/staged.ts", "modified")]}
				unstaged={[]}
				selectedPath={null}
				onSelectFile={() => undefined}
				comment=""
				onCommentChange={onCommentChange}
				onCommit={() => undefined}
				onStage={() => undefined}
				onUnstage={() => undefined}
			/>,
		);

		const input = screen.getByLabelText(/commit message/i);
		await user.type(input, "Ship the diff list");
		expect(onCommentChange).toHaveBeenCalled();
	});

	it("calls onSelectFile when a row is clicked", async () => {
		const user = userEvent.setup();
		const onSelectFile = vi.fn();
		const file = makeFile("src/selected.ts", "modified");

		render(
			<FileListPane
				staged={[file]}
				unstaged={[]}
				selectedPath={null}
				onSelectFile={onSelectFile}
				comment=""
				onCommentChange={() => undefined}
				onCommit={() => undefined}
				onStage={() => undefined}
				onUnstage={() => undefined}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /select src\/selected\.ts/i }));
		expect(onSelectFile).toHaveBeenCalledWith("src/selected.ts");
	});
});
