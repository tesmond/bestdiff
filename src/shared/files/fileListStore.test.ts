import { describe, expect, it, vi } from "vitest";
import type { DiffFile } from "../diff/model";
import { FileListStore } from "./fileListStore";

function makeFile(path: string): DiffFile {
	return {
		oldPath: path,
		newPath: path,
		status: "modified",
		hunks: [],
	};
}

describe("FileListStore", () => {
	it("groups files as unstaged by default", () => {
		const store = new FileListStore();
		store.setFiles([makeFile("src/a.txt"), makeFile("src/b.txt")]);

		const state = store.getState();
		expect(state.unstaged).toHaveLength(2);
		expect(state.staged).toHaveLength(0);
	});

	it("moves files between groups", () => {
		const store = new FileListStore({
			staged: [],
			unstaged: [makeFile("src/a.txt")],
		});

		store.moveFile("src/a.txt", "staged");
		let state = store.getState();
		expect(state.staged).toHaveLength(1);
		expect(state.unstaged).toHaveLength(0);

		store.moveFile("src/a.txt", "unstaged");
		state = store.getState();
		expect(state.staged).toHaveLength(0);
		expect(state.unstaged).toHaveLength(1);
	});

	it("emits changes when moving files", () => {
		const store = new FileListStore({
			staged: [],
			unstaged: [makeFile("src/a.txt")],
		});
		const listener = vi.fn();
		store.onChange(listener);

		store.moveFile("src/a.txt", "staged");
		expect(listener).toHaveBeenCalledTimes(1);
	});
});
