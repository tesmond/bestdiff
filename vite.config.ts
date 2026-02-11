import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
	root: "src/mainview",
	build: {
		outDir: "../../dist",
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		strictPort: true,
	},
	test: {
		environment: "jsdom",
		setupFiles: "./test/setup.ts",
		include: [
			"**/*.{test,spec}.{ts,tsx}",
			"../shared/**/*.{test,spec}.ts",
		],
	},
});
