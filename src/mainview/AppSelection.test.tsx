import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App selection", () => {
	it("updates the selected file preview", async () => {
		const user = userEvent.setup();
		render(<App />);

		const target = screen.getByRole("button", { name: /select src\/app\.tsx/i });
		await user.click(target);

		expect(
			screen.getByRole("region", { name: /selected file preview/i }),
		).toHaveTextContent("src/app.tsx");
	});
});
