import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { DiffFile } from "../shared/diff/model";
import { parseUnifiedDiff } from "../shared/diff/parse";
import { normalizeLineEndings } from "../shared/diff/normalize";
import type { FileContents, WorkspaceDiffPayload } from "../shared/electrobun/rpc";

type GitDiffGroup = "staged" | "unstaged";

async function runGit(args: string[], cwd: string): Promise<string> {
	const proc = Bun.spawn(["git", ...args], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
		proc.exited,
	]);

	if (exitCode !== 0) {
		const message = stderr.trim() || `git ${args.join(" ")} failed`;
		throw new Error(message);
	}

	return stdout;
}

function splitLines(contents: string): string[] {
	if (!contents) {
		return [];
	}
	return normalizeLineEndings(contents).split("\n");
}

function getDisplayPath(file: DiffFile): string | null {
	return file.newPath ?? file.oldPath ?? null;
}

async function readFileSafe(filePath: string): Promise<string> {
	try {
		return await readFile(filePath, "utf-8");
	} catch {
		return "";
	}
}

async function gitShowSafe(cwd: string, spec: string): Promise<string> {
	try {
		return await runGit(["show", spec], cwd);
	} catch {
		return "";
	}
}

async function loadFileContents(
	cwd: string,
	file: DiffFile,
	source: GitDiffGroup,
): Promise<FileContents> {
	const oldPath = file.oldPath ?? file.newPath ?? "";
	const newPath = file.newPath ?? file.oldPath ?? "";

	let oldContent = "";
	let newContent = "";

	if (file.status !== "added" && oldPath) {
		oldContent = await gitShowSafe(cwd, `HEAD:${oldPath}`);
	}

	if (file.status !== "deleted") {
		if (source === "staged") {
			if (newPath) {
				newContent = await gitShowSafe(cwd, `:${newPath}`);
			}
		} else if (newPath) {
			newContent = await readFileSafe(join(cwd, newPath));
		}
	}

	return {
		oldLines: splitLines(oldContent),
		newLines: splitLines(newContent),
	};
}

async function loadDiffFiles(cwd: string, args: string[]): Promise<DiffFile[]> {
	const diffText = await runGit(args, cwd);
	if (!diffText.trim()) {
		return [];
	}
	return parseUnifiedDiff(diffText).files;
}

async function collectContents(
	cwd: string,
	files: DiffFile[],
	source: GitDiffGroup,
	into: Record<string, FileContents>,
): Promise<void> {
	for (const file of files) {
		const displayPath = getDisplayPath(file);
		if (!displayPath) {
			continue;
		}
		into[displayPath] = await loadFileContents(cwd, file, source);
	}
}

export async function loadWorkspaceDiff(rootPath: string): Promise<WorkspaceDiffPayload> {
	const [staged, unstaged] = await Promise.all([
		loadDiffFiles(rootPath, ["diff", "--cached"]),
		loadDiffFiles(rootPath, ["diff"]),
	]);

	const fileContents: Record<string, FileContents> = {};
	await collectContents(rootPath, staged, "staged", fileContents);
	await collectContents(rootPath, unstaged, "unstaged", fileContents);

	return {
		rootPath,
		staged,
		unstaged,
		fileContents,
	};
}
