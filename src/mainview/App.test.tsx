import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
	it("renders the main heading", () => {
		render(<App />);

		expect(
			screen.getByRole("heading", { name: /best diff/i }),
		).toBeInTheDocument();
	});

	it("applies the root layout classes", () => {
		const { container } = render(<App />);
		const root = container.firstElementChild;

		expect(root).toBeTruthy();
		expect(root).toHaveClass("h-screen", "bg-gradient-to-br");
	});
});
