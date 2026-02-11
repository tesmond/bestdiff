import { useEffect, useMemo, useRef, useState } from "react";
import { Electroview, createRPC } from "electrobun/view";
import type { DiffFile } from "../shared/diff/model";
import { parseUnifiedDiff } from "../shared/diff/parse";
import type { BestDiffRPCSchema, FileContents, WorkspaceDiffPayload } from "../shared/electrobun/rpc";
import { FileListPane } from "./components/FileListPane";
import { SideBySideDiff } from "./components/SideBySideDiff";

const mockStagedFiles: DiffFile[] = [
	{
		oldPath: "src/ui/FileList.tsx",
		newPath: "src/ui/FileList.tsx",
		status: "modified",
		hunks: [],
	},
];

const mockUnstagedFiles: DiffFile[] = [
	{
		oldPath: "src/app.tsx",
		newPath: "src/app.tsx",
		status: "modified",
		hunks: [],
	},
	{
		oldPath: null,
		newPath: "src/logic/diff-engine.ts",
		status: "added",
		hunks: [],
	},
	{
		oldPath: "src/old/legacy.ts",
		newPath: null,
		status: "deleted",
		hunks: [],
	},
];

function makeMockDiff(filePath: string): DiffFile {
	const contextLines = Array.from({ length: 32 }, (_, index) => {
		const lineNumber = index + 1;
		return ` const line${lineNumber} = ${lineNumber};`;
	});

	const diffText = [
		`diff --git a/${filePath} b/${filePath}`,
		`--- a/${filePath}`,
		`+++ b/${filePath}`,
		"@@ -1,6 +1,8 @@",
		contextLines[0],
		contextLines[1],
		"-const beta = 2;",
		"+const beta = 3;",
		"+const gamma = 4;",
		contextLines[2],
		contextLines[3],
		"@@ -12,8 +14,9 @@",
		contextLines[10],
		contextLines[11],
		"-const delta = 9;",
		"+const delta = 10;",
		"+const delta2 = 11;",
		"+const delta3 = 12;",
		contextLines[12],
		"+const epsilon = 11;",
		contextLines[13],
		contextLines[14],
		"@@ -24,6 +27,7 @@",
		contextLines[20],
		contextLines[21],
		"-const removed = true;",
		"-const zeta = 14;",
		"+const zeta = 15;",
		contextLines[22],
		"+const eta = 16;",
		contextLines[23],
		contextLines[24],
		"@@ -32,5 +36,5 @@",
		contextLines[28],
		contextLines[29],
		"-const omega = 20;",
		"+const omega = 21;",
		contextLines[30],
		contextLines[31],
	].join("\n");

	return parseUnifiedDiff(diffText).files[0];
}

function makeMockFileLines(): string[] {
	return Array.from({ length: 40 }, (_, index) => {
		const lineNumber = index + 1;
		return ` const line${lineNumber} = ${lineNumber};`;
	});
}

const mockDiffs = new Map<string, DiffFile>(
	[...mockStagedFiles, ...mockUnstagedFiles]
		.map((file) => file.newPath ?? file.oldPath)
		.filter((path): path is string => Boolean(path))
		.map((path) => [path, makeMockDiff(path)]),
);

const mockFileContents = new Map<
	string,
	{
		oldLines: string[];
		newLines: string[];
	}
>(
	[...mockStagedFiles, ...mockUnstagedFiles]
		.map((file) => ({
			path: file.newPath ?? file.oldPath,
			status: file.status,
		}))
		.filter((entry): entry is { path: string; status: DiffFile["status"] } =>
			Boolean(entry.path),
		)
		.map((entry) => {
			const lines = makeMockFileLines();
			if (entry.status === "added") {
				return [entry.path, { oldLines: [], newLines: lines }] as const;
			}
			if (entry.status === "deleted") {
				return [entry.path, { oldLines: lines, newLines: [] }] as const;
			}
			return [entry.path, { oldLines: lines, newLines: lines }] as const;
		}),
);

const isTestEnv = import.meta.env.MODE === "test";

function buildDiffMap(files: DiffFile[]): Map<string, DiffFile> {
	return new Map(
		files
			.map((file) => [file.newPath ?? file.oldPath, file] as const)
			.filter((entry): entry is [string, DiffFile] => Boolean(entry[0])),
	);
}

function buildContentsMap(contents: WorkspaceDiffPayload["fileContents"]): Map<string, FileContents> {
	return new Map(Object.entries(contents));
}

function App() {
	const [comment, setComment] = useState("");
	const [leftWidth, setLeftWidth] = useState(320);
	const [isResizing, setIsResizing] = useState(false);
	const [workspacePath, setWorkspacePath] = useState<string | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [stagedFiles, setStagedFiles] = useState<DiffFile[]>(
		isTestEnv ? mockStagedFiles : [],
	);
	const [unstagedFiles, setUnstagedFiles] = useState<DiffFile[]>(
		isTestEnv ? mockUnstagedFiles : [],
	);
	const [diffsByPath, setDiffsByPath] = useState<Map<string, DiffFile>>(
		isTestEnv
			? new Map([...mockDiffs.entries()])
			: new Map(),
	);
	const [fileContentsByPath, setFileContentsByPath] = useState<
		Map<string, FileContents>
	>(isTestEnv ? new Map([...mockFileContents.entries()]) : new Map());
	const layoutRef = useRef<HTMLDivElement | null>(null);
	const [selectedPath, setSelectedPath] = useState<string | null>(
		isTestEnv
			? mockStagedFiles[0]?.newPath ?? mockStagedFiles[0]?.oldPath ?? null
			: null,
	);

	const selectedFile =
		[...stagedFiles, ...unstagedFiles].find(
			(file) => file.newPath === selectedPath || file.oldPath === selectedPath,
		) ?? null;

	const selectedDiff = selectedFile
		? diffsByPath.get(selectedFile.newPath ?? selectedFile.oldPath ?? "") ?? null
		: null;
	const selectedContents = selectedFile
		? fileContentsByPath.get(selectedFile.newPath ?? selectedFile.oldPath ?? "") ?? null
		: null;

	const hasElectrobun = useMemo(() => {
		return typeof window !== "undefined" && "__electrobunWebviewId" in window;
	}, []);

	const applyWorkspacePayload = (payload: WorkspaceDiffPayload) => {
		setWorkspacePath(payload.rootPath);
		setLoadError(null);
		setStagedFiles(payload.staged);
		setUnstagedFiles(payload.unstaged);
		setDiffsByPath(buildDiffMap([...payload.staged, ...payload.unstaged]));
		setFileContentsByPath(buildContentsMap(payload.fileContents));
		const nextSelection =
			payload.staged[0]?.newPath ??
			payload.staged[0]?.oldPath ??
			payload.unstaged[0]?.newPath ??
			payload.unstaged[0]?.oldPath ??
			null;
		setSelectedPath(nextSelection);
	};

	useEffect(() => {
		if (!hasElectrobun || isTestEnv) {
			return;
		}

		type WebviewSchema = BestDiffRPCSchema["webview"];
		type BunSchema = BestDiffRPCSchema["bun"];
		const rpc = createRPC<WebviewSchema, BunSchema>({
			transport: {
				registerHandler: () => undefined,
			},
		});
		rpc.addMessageListener("workspaceLoaded", (payload) => {
			applyWorkspacePayload(payload);
		});
		rpc.addMessageListener("workspaceError", ({ message }) => {
			setLoadError(message);
		});

		new Electroview({ rpc });
		rpc.request
			.getWorkspace()
			.then((payload) => {
				if (payload) {
					applyWorkspacePayload(payload);
				}
			})
			.catch((error) => {
				const message = error instanceof Error ? error.message : "Failed to load workspace.";
				setLoadError(message);
			});
	}, [hasElectrobun]);

	useEffect(() => {
		if (!isResizing) {
			return;
		}

		const handleMove = (event: MouseEvent) => {
			const container = layoutRef.current;
			if (!container) {
				return;
			}
			const bounds = container.getBoundingClientRect();
			const nextWidth = event.clientX - bounds.left;
			const minWidth = 240;
			const maxWidth = Math.min(520, bounds.width - 360);
			const clamped = Math.max(minWidth, Math.min(nextWidth, maxWidth));
			setLeftWidth(clamped);
		};

		const handleUp = () => {
			setIsResizing(false);
		};

		window.addEventListener("mousemove", handleMove);
		window.addEventListener("mouseup", handleUp);
		return () => {
			window.removeEventListener("mousemove", handleMove);
			window.removeEventListener("mouseup", handleUp);
		};
	}, [isResizing]);


	return (
		<div className="h-screen overflow-hidden bg-gradient-to-br from-stone-100 via-amber-50 to-orange-100 text-slate-900">
			<div className="mx-auto flex h-full w-full max-w-none flex-col px-4 py-8">
				<div
					className={`flex min-h-0 flex-1 ${isResizing ? "select-none" : ""}`}
					ref={layoutRef}
				>
					<aside
						className="h-full min-h-0 shrink-0 overflow-y-auto rounded-2xl border border-white/70 bg-white/80 p-6 shadow-xl shadow-orange-100/60"
						style={{ width: leftWidth }}
					>
					<FileListPane
						staged={stagedFiles}
						unstaged={unstagedFiles}
						selectedPath={selectedPath}
						onSelectFile={setSelectedPath}
						comment={comment}
						onCommentChange={setComment}
						onCommit={() => undefined}
						onStage={() => undefined}
						onUnstage={() => undefined}
					/>
				</aside>
					<div
						className="mx-3 w-1.5 shrink-0 cursor-col-resize rounded-full bg-slate-200/80"
						onMouseDown={() => setIsResizing(true)}
						role="separator"
						aria-orientation="vertical"
						aria-valuenow={Math.round(leftWidth)}
						aria-valuemin={240}
						aria-valuemax={520}
					/>
					<main className="flex min-w-0 flex-1 overflow-y-auto rounded-2xl border border-white/70 bg-white/60 p-8 shadow-xl shadow-orange-100/40">
						<div className="flex min-h-0 w-full flex-col gap-4">
						<div className="flex items-center justify-between">
							<div>
								<h2 className="text-xl font-semibold text-slate-900">Diff Viewer</h2>
								<p className="text-sm text-slate-600">
									Select a file on the left to preview side-by-side changes.
								</p>
							</div>
							<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
								Preview
							</span>
						</div>
						{loadError ? (
							<div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
								{loadError}
							</div>
						) : null}
						{workspacePath ? (
							<div className="rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-xs text-slate-500">
								Workspace: {workspacePath}
							</div>
						) : null}
						<div
							className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700"
							role="region"
							aria-label="Selected file preview"
						>
							<span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
								Selected
							</span>
							<span className="truncate font-medium">
								{selectedFile
									? selectedFile.newPath ?? selectedFile.oldPath
									: "No file selected"}
							</span>
						</div>
						<div className="relative flex-1 overflow-hidden">
							<SideBySideDiff
								key={selectedFile?.newPath ?? selectedFile?.oldPath ?? "none"}
								file={selectedDiff}
								oldFileLines={selectedContents?.oldLines}
								newFileLines={selectedContents?.newLines}
							/>
						</div>
					</div>
				</main>
				</div>
			</div>
		</div>
	);
}

export default App;
