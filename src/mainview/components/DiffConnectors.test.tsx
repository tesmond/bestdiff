import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildConnectorAreaPath, DiffConnectors } from "./DiffConnectors";

describe("DiffConnectors", () => {
	it("builds a smooth bezier path", () => {
		const path = buildConnectorAreaPath({
			id: "a",
			fromTop: { x: 10, y: 20 },
			fromBottom: { x: 10, y: 40 },
			toTop: { x: 110, y: 120 },
			toBottom: { x: 110, y: 140 },
			curveStartX: 20,
			curveEndX: 90,
			color: "#2563eb",
		});
		expect(path).toContain("M 10 20 L 20 20 C 55 20, 55 120, 90 120");
	});

	it("renders connector paths", () => {
		const { container } = render(
			<DiffConnectors
				connectors={[
					{
						id: "a",
						fromTop: { x: 0, y: 0 },
						fromBottom: { x: 0, y: 20 },
						toTop: { x: 100, y: 40 },
						toBottom: { x: 100, y: 60 },
						curveStartX: 10,
						curveEndX: 90,
						color: "#2563eb",
					},
				]}
			/>,
		);

		const svg = container.querySelector("svg");
		expect(svg).toBeTruthy();
		expect(svg?.querySelectorAll("path")).toHaveLength(1);
	});
});
