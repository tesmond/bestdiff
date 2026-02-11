export type GitRunOptions = {
	cwd?: string;
};

export type GitRunner = (args: string[], options?: GitRunOptions) => Promise<void>;

export class GitClient {
	private run: GitRunner;

	constructor(run: GitRunner) {
		this.run = run;
	}

	stageFile(filePath: string, options?: GitRunOptions): Promise<void> {
		return this.run(["add", "--", filePath], options);
	}

	unstageFile(filePath: string, options?: GitRunOptions): Promise<void> {
		return this.run(["reset", "--", filePath], options);
	}
}
