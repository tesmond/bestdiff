export type ScrollSyncOptions = {
	maxDelta?: number;
};

export class ScrollSyncController {
	private left: HTMLElement;
	private right: HTMLElement;
	private isSyncing = false;
	private maxDelta: number;
	private onLeftScroll: () => void;
	private onRightScroll: () => void;

	constructor(left: HTMLElement, right: HTMLElement, options: ScrollSyncOptions = {}) {
		this.left = left;
		this.right = right;
		this.maxDelta = options.maxDelta ?? 2;
		this.onLeftScroll = () => this.sync(this.left, this.right);
		this.onRightScroll = () => this.sync(this.right, this.left);
	}

	attach(): void {
		this.left.addEventListener("scroll", this.onLeftScroll);
		this.right.addEventListener("scroll", this.onRightScroll);
	}

	detach(): void {
		this.left.removeEventListener("scroll", this.onLeftScroll);
		this.right.removeEventListener("scroll", this.onRightScroll);
	}

	private sync(source: HTMLElement, target: HTMLElement): void {
		if (this.isSyncing) {
			return;
		}

		const delta = Math.abs(target.scrollTop - source.scrollTop);
		if (delta <= this.maxDelta) {
			return;
		}

		this.isSyncing = true;
		target.scrollTop = source.scrollTop;
		this.isSyncing = false;
	}
}
