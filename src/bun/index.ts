import { ApplicationMenu, BrowserView, BrowserWindow, Updater, Utils } from "electrobun/bun";
import type { BestDiffRPCSchema } from "../shared/electrobun/rpc";
import { loadWorkspaceDiff } from "./gitWorkspace";

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

// Check if Vite dev server is running for HMR
async function getMainViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log(
				"Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
			);
		}
	}
	return "views://mainview/index.html";
}

const rpc = BrowserView.defineRPC<BestDiffRPCSchema>({
	handlers: {
		requests: {
			openWorkspace: async () => openWorkspaceFromDialog(),
			getWorkspace: async () => currentWorkspace,
		},
		messages: {},
	},
});

let currentWorkspace: Awaited<ReturnType<typeof loadWorkspaceDiff>> | null = null;

async function openWorkspaceFromDialog() {
	const selections = await Utils.openFileDialog({
		canChooseDirectory: true,
		canChooseFiles: false,
		allowsMultipleSelection: false,
	});
	const rootPath = selections[0];
	if (!rootPath) {
		return null;
	}

	try {
		currentWorkspace = await loadWorkspaceDiff(rootPath);
		rpc.send.workspaceLoaded(currentWorkspace);
		return currentWorkspace;
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to load workspace.";
		rpc.send.workspaceError({ message });
		return null;
	}
}

// Create the main application window
const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
	title: "Best Diff",
	url,
	rpc,
	frame: {
		width: 900,
		height: 700,
		x: 200,
		y: 200,
	},
});

ApplicationMenu.setApplicationMenu([
	{
		label: "File",
		submenu: [
			{
				label: "Open Workspace...",
				action: "open-workspace",
			},
			{ type: "divider" },
			{ role: "quit" },
		],
	},
]);

ApplicationMenu.on("application-menu-clicked", async (event) => {
	if (event && typeof event === "object" && "data" in event) {
		const data = (event as { data: { action?: string } }).data;
		if (data?.action === "open-workspace") {
			await openWorkspaceFromDialog();
		}
	}
});

// Quit the app when the main window is closed
mainWindow.on("close", () => {
	Utils.quit();
});

console.log("App started!");
