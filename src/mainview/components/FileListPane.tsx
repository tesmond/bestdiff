import type { DiffFile } from "../../shared/diff/model";

export type FileListPaneProps = {
	staged: DiffFile[];
	unstaged: DiffFile[];
	selectedPath: string | null;
	onSelectFile: (filePath: string) => void;
	comment: string;
	onCommentChange: (value: string) => void;
	onCommit: (message: string) => void;
	onStage: (filePath: string) => void;
	onUnstage: (filePath: string) => void;
};

function getDisplayPath(file: DiffFile): string {
	return file.newPath ?? file.oldPath ?? "unknown";
}

function getStatusStyles(status: DiffFile["status"]): { label: string; className: string } {
	switch (status) {
		case "added":
			return { label: "Added", className: "bg-teal-100 text-teal-700" };
		case "deleted":
			return { label: "Deleted", className: "bg-rose-100 text-rose-700" };
		default:
			return { label: "Modified", className: "bg-amber-100 text-amber-700" };
	}
}

function FileRow({
	file,
	group,
	selectedPath,
	onSelectFile,
	onStage,
	onUnstage,
}: {
	file: DiffFile;
	group: "staged" | "unstaged";
	selectedPath: string | null;
	onSelectFile: (filePath: string) => void;
	onStage: (filePath: string) => void;
	onUnstage: (filePath: string) => void;
}) {
	const displayPath = getDisplayPath(file);
	const status = getStatusStyles(file.status);
	const isSelected = selectedPath === displayPath;

	return (
		<div
			className={`flex items-center justify-between rounded-lg border px-3 py-2 shadow-sm transition ${
				isSelected
					? "border-slate-900/80 bg-slate-900 text-amber-50 shadow-lg"
					: "border-white/10 bg-white/70 text-slate-900"
			}`}
			role="button"
			tabIndex={0}
			aria-label={`Select ${displayPath}`}
			onClick={() => onSelectFile(displayPath)}
			onKeyDown={(event) => {
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					onSelectFile(displayPath);
				}
			}}
		>
			<div className="min-w-0 text-left">
				<div className="truncate text-sm font-semibold">{displayPath}</div>
				<span
					className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
				>
					{status.label}
				</span>
			</div>
			<button
				onClick={(event) => {
					event.stopPropagation();
					if (group === "staged") {
						onUnstage(displayPath);
						return;
					}
					onStage(displayPath);
				}}
				className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
					isSelected
						? "border-amber-200 text-amber-50 hover:border-amber-100"
						: "border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900"
				}`}
				aria-label={group === "staged" ? `Unstage ${displayPath}` : `Stage ${displayPath}`}
			>
				{group === "staged" ? "Unstage" : "Stage"}
			</button>
		</div>
	);
}

function FileGroup({
	label,
	files,
	group,
	selectedPath,
	onSelectFile,
	onStage,
	onUnstage,
	isEmptyMessage,
}: {
	label: string;
	files: DiffFile[];
	group: "staged" | "unstaged";
	selectedPath: string | null;
	onSelectFile: (filePath: string) => void;
	onStage: (filePath: string) => void;
	onUnstage: (filePath: string) => void;
	isEmptyMessage: string;
}) {
	return (
		<section className="space-y-3">
			<div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
				<span>{label}</span>
				<span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
					{files.length}
				</span>
			</div>
			<div className="space-y-2" data-testid={`file-group-${group}`}>
				{files.length === 0 ? (
					<div className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-500">
						{isEmptyMessage}
					</div>
				) : (
					files.map((file) => (
						<FileRow
							key={`${file.oldPath ?? ""}-${file.newPath ?? ""}`}
							file={file}
							group={group}
							selectedPath={selectedPath}
							onSelectFile={onSelectFile}
							onStage={onStage}
							onUnstage={onUnstage}
						/>
					))
				)}
			</div>
		</section>
	);
}

export function FileListPane({
	staged,
	unstaged,
	selectedPath,
	onSelectFile,
	comment,
	onCommentChange,
	onCommit,
	onStage,
	onUnstage,
}: FileListPaneProps) {
	const canCommit = staged.length > 0;

	return (
		<div className="flex h-full flex-col gap-6">
			<header className="space-y-2">
				<div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Workspace</div>
				<h1 className="text-2xl font-semibold text-slate-900">Best Diff</h1>
				<p className="text-sm text-slate-600">Review changes, stage files, and keep the diff focused.</p>
			</header>

			<section className="space-y-3">
				<div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
					Commit Message
				</div>
				<textarea
					value={comment}
					onChange={(event) => onCommentChange(event.target.value)}
					rows={3}
					placeholder="Summarize what changed..."
					className="w-full resize-none rounded-xl border border-slate-200 bg-white/80 p-3 text-sm text-slate-800 shadow-sm focus:border-slate-400 focus:outline-none"
					aria-label="Commit message"
				/>
				<button
					onClick={() => onCommit(comment)}
					disabled={!canCommit}
					className={`w-full rounded-xl px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition ${
						canCommit
							? "bg-slate-900 text-amber-100 hover:bg-slate-800"
							: "cursor-not-allowed bg-slate-200 text-slate-400"
					}`}
					aria-label="Commit staged changes"
				>
					Commit Changes
				</button>
				<p className="text-xs text-slate-500">
					{canCommit
						? "Ready to commit staged changes."
						: "Stage at least one file to enable commits."}
				</p>
			</section>

			<FileGroup
				label="Staged Changes"
				files={staged}
				group="staged"
				selectedPath={selectedPath}
				onSelectFile={onSelectFile}
				onStage={onStage}
				onUnstage={onUnstage}
				isEmptyMessage="No staged changes yet."
			/>
			<FileGroup
				label="Changes"
				files={unstaged}
				group="unstaged"
				selectedPath={selectedPath}
				onSelectFile={onSelectFile}
				onStage={onStage}
				onUnstage={onUnstage}
				isEmptyMessage="Working tree is clean."
			/>
		</div>
	);
}
