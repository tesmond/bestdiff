import { describe, expect, it, vi } from "vitest";
import { GitClient } from "./gitClient";

describe("GitClient", () => {
	it("stages files via git add", async () => {
		const runner = vi.fn().mockResolvedValue(undefined);
		const client = new GitClient(runner);

		await client.stageFile("src/a.txt", { cwd: "C:/repo" });

		expect(runner).toHaveBeenCalledWith(["add", "--", "src/a.txt"], {
			cwd: "C:/repo",
		});
	});

	it("unstages files via git reset", async () => {
		const runner = vi.fn().mockResolvedValue(undefined);
		const client = new GitClient(runner);

		await client.unstageFile("src/b.txt");

		expect(runner).toHaveBeenCalledWith(["reset", "--", "src/b.txt"], undefined);
	});
});
