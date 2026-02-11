import type { DiffFile } from "../diff/model";

export type FileGroup = "staged" | "unstaged";

export type FileListState = {
	staged: DiffFile[];
	unstaged: DiffFile[];
};

export type FileListListener = (state: FileListState) => void;

function cloneState(state: FileListState): FileListState {
	return {
		staged: [...state.staged],
		unstaged: [...state.unstaged],
	};
}

export class FileListStore {
	private state: FileListState;
	private listeners: Set<FileListListener>;

	constructor(initial: FileListState = { staged: [], unstaged: [] }) {
		this.state = cloneState(initial);
		this.listeners = new Set();
	}

	getState(): FileListState {
		return cloneState(this.state);
	}

	setFiles(files: DiffFile[]): void {
		this.state.unstaged = [...files];
		this.state.staged = [];
		this.emit();
	}

	moveFile(filePath: string, target: FileGroup): void {
		const sourceGroup: FileGroup = target === "staged" ? "unstaged" : "staged";
		const source = this.state[sourceGroup];
		const targetList = this.state[target];
		const index = source.findIndex((file) => file.newPath === filePath || file.oldPath === filePath);

		if (index === -1) {
			return;
		}

		const [file] = source.splice(index, 1);
		if (!targetList.some((item) => item.newPath === file.newPath && item.oldPath === file.oldPath)) {
			targetList.push(file);
		}
		this.emit();
	}

	onChange(listener: FileListListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private emit(): void {
		const snapshot = this.getState();
		for (const listener of this.listeners) {
			listener(snapshot);
		}
	}
}
