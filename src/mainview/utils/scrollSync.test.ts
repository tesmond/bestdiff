import { describe, expect, it } from "vitest";
import { ScrollSyncController } from "./scrollSync";

describe("ScrollSyncController", () => {
	it("syncs scrollTop between panes", () => {
		const left = document.createElement("div");
		const right = document.createElement("div");
		const controller = new ScrollSyncController(left, right, { maxDelta: 0 });
		controller.attach();

		left.scrollTop = 120;
		left.dispatchEvent(new Event("scroll"));
		expect(right.scrollTop).toBe(120);

		right.scrollTop = 40;
		right.dispatchEvent(new Event("scroll"));
		expect(left.scrollTop).toBe(40);

		controller.detach();
	});

	it("ignores tiny deltas", () => {
		const left = document.createElement("div");
		const right = document.createElement("div");
		const controller = new ScrollSyncController(left, right, { maxDelta: 5 });
		controller.attach();

		left.scrollTop = 10;
		right.scrollTop = 12;
		left.dispatchEvent(new Event("scroll"));
		expect(right.scrollTop).toBe(12);

		controller.detach();
	});
});
