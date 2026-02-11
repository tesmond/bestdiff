import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DiffFile, DiffLine } from "../../shared/diff/model";
import { DiffConnectors } from "./DiffConnectors";

export type SideBySideDiffProps = {
	file: DiffFile | null;
	oldFileLines?: string[];
	newFileLines?: string[];
};


type LeftItem = {
	rowId: string;
	line: DiffLine;
	kind: "context" | "removed" | "change";
};

type RightItem = {
	rowId: string;
	line: DiffLine;
	kind: "context" | "added" | "change";
	anchorOldLine: number | null;
};

type ConnectorMeta =
	| {
			type: "change";
			startRowId: string;
			endRowId: string;
	  }
	| {
			type: "added";
			startRowId: string;
			endRowId: string;
			anchorOldLine: number | null;
	  }
	| {
			type: "removed";
			startRowId: string;
			endRowId: string;
			anchorNewLine: number | null;
	  };

function getScrollParents(element: HTMLElement | null): HTMLElement[] {
	const parents: HTMLElement[] = [];
	let current = element?.parentElement ?? null;
	while (current) {
		const style = window.getComputedStyle(current);
		const overflowY = style.overflowY;
		if (overflowY === "auto" || overflowY === "scroll") {
			parents.push(current);
		}
		current = current.parentElement;
	}
	return parents;
}

function getLeftStyles(line: DiffLine | null): string {
	if (!line) {
		return "text-slate-300";
	}
	return "text-slate-700";
}

function getRightStyles(line: DiffLine | null): string {
	if (!line) {
		return "text-slate-300";
	}
	return "text-slate-700";
}

type InlineDiff = {
	before: string;
	changed: string;
	after: string;
};

function buildInlineDiff(oldText: string, newText: string): { old: InlineDiff; next: InlineDiff } {
	if (!oldText && !newText) {
		return {
			old: { before: "", changed: "", after: "" },
			next: { before: "", changed: "", after: "" },
		};
	}

	const oldLength = oldText.length;
	const newLength = newText.length;
	let prefix = 0;
	while (
		prefix < oldLength &&
		prefix < newLength &&
		oldText[prefix] === newText[prefix]
	) {
		prefix += 1;
	}

	let suffix = 0;
	while (
		suffix < oldLength - prefix &&
		suffix < newLength - prefix &&
		oldText[oldLength - 1 - suffix] === newText[newLength - 1 - suffix]
	) {
		suffix += 1;
	}

	return {
		old: {
			before: oldText.slice(0, prefix),
			changed: oldText.slice(prefix, oldLength - suffix),
			after: oldText.slice(oldLength - suffix),
		},
		next: {
			before: newText.slice(0, prefix),
			changed: newText.slice(prefix, newLength - suffix),
			after: newText.slice(newLength - suffix),
		},
	};
}

function buildColumns(
	file: DiffFile,
	oldFileLines?: string[],
	newFileLines?: string[],
): {
	leftItems: LeftItem[];
	rightItems: RightItem[];
	connectors: ConnectorMeta[];
} {
	const leftItems: LeftItem[] = [];
	const rightItems: RightItem[] = [];
	const connectors: ConnectorMeta[] = [];
	let lastOldLine = 0;
	let lastNewLine = 0;
	const hasFullFiles = Boolean(oldFileLines?.length || newFileLines?.length);
	const safeOldLines = oldFileLines ?? [];
	const safeNewLines = newFileLines ?? [];
	const totalOldLines = safeOldLines.length;
	const totalNewLines = safeNewLines.length;

	const pushContextRow = (
		rowId: string,
		content: string,
		oldLineNumber: number,
		newLineNumber: number,
	) => {
		const line: DiffLine = {
			type: "context",
			content,
			oldLineNumber,
			newLineNumber,
		};
		leftItems.push({ rowId, line, kind: "context" });
		rightItems.push({ rowId, line, kind: "context", anchorOldLine: null });
		lastOldLine = oldLineNumber;
		lastNewLine = newLineNumber;
	};

	const pushRemovedRow = (rowId: string, content: string, oldLineNumber: number) => {
		const line: DiffLine = { type: "removed", content, oldLineNumber };
		leftItems.push({ rowId, line, kind: "removed" });
		connectors.push({
			type: "removed",
			startRowId: rowId,
			endRowId: rowId,
			anchorNewLine: lastNewLine || null,
		});
		lastOldLine = oldLineNumber;
	};

	const pushAddedRow = (rowId: string, content: string, newLineNumber: number) => {
		const line: DiffLine = { type: "added", content, newLineNumber };
		rightItems.push({
			rowId,
			line,
			kind: "added",
			anchorOldLine: lastOldLine || null,
		});
		connectors.push({
			type: "added",
			startRowId: rowId,
			endRowId: rowId,
			anchorOldLine: lastOldLine || null,
		});
		lastNewLine = newLineNumber;
	};

	const pushGapLines = (
		oldStart: number,
		oldEnd: number,
		newStart: number,
		newEnd: number,
	) => {
		if (oldEnd < oldStart && newEnd < newStart) {
			return;
		}
		const oldCount = Math.max(0, oldEnd - oldStart + 1);
		const newCount = Math.max(0, newEnd - newStart + 1);
		const maxCount = Math.max(oldCount, newCount);

		for (let offset = 0; offset < maxCount; offset += 1) {
			const oldLineNumber = oldStart + offset;
			const newLineNumber = newStart + offset;
			const hasOld = offset < oldCount;
			const hasNew = offset < newCount;

			if (hasOld && hasNew) {
				const rowId = `context-full-${oldLineNumber}-${newLineNumber}`;
				pushContextRow(
					rowId,
					safeOldLines[oldLineNumber - 1] ?? "",
					oldLineNumber,
					newLineNumber,
				);
				continue;
			}

			if (hasOld) {
				const rowId = `removed-full-${oldLineNumber}`;
				pushRemovedRow(rowId, safeOldLines[oldLineNumber - 1] ?? "", oldLineNumber);
				continue;
			}

			if (hasNew) {
				const rowId = `added-full-${newLineNumber}`;
				pushAddedRow(rowId, safeNewLines[newLineNumber - 1] ?? "", newLineNumber);
			}
		}
	};

	let nextOldLine = 1;
	let nextNewLine = 1;

	file.hunks.forEach((hunk, hunkIndex) => {
		if (hasFullFiles) {
			pushGapLines(
				nextOldLine,
				hunk.oldStart - 1,
				nextNewLine,
				hunk.newStart - 1,
			);
		}

		for (let i = 0; i < hunk.lines.length; i += 1) {
			const line = hunk.lines[i];
			const next = hunk.lines[i + 1];

			if (line.type === "context") {
				const rowId = `context-${hunkIndex}-${i}`;
				leftItems.push({ rowId, line, kind: "context" });
				rightItems.push({ rowId, line, kind: "context", anchorOldLine: null });
				lastOldLine = line.oldLineNumber ?? lastOldLine;
				lastNewLine = line.newLineNumber ?? lastNewLine;
				continue;
			}

			if (line.type === "removed" && next?.type === "added") {
				const rowId = `change-${hunkIndex}-${i}`;
				leftItems.push({ rowId, line, kind: "change" });
				rightItems.push({ rowId, line: next, kind: "change", anchorOldLine: null });
				connectors.push({ type: "change", startRowId: rowId, endRowId: rowId });
				lastOldLine = line.oldLineNumber ?? lastOldLine;
				lastNewLine = next.newLineNumber ?? lastNewLine;
				i += 1;
				continue;
			}

			if (line.type === "added" && next?.type === "removed") {
				const rowId = `change-${hunkIndex}-${i}`;
				leftItems.push({ rowId, line: next, kind: "change" });
				rightItems.push({ rowId, line, kind: "change", anchorOldLine: null });
				connectors.push({ type: "change", startRowId: rowId, endRowId: rowId });
				lastOldLine = next.oldLineNumber ?? lastOldLine;
				lastNewLine = line.newLineNumber ?? lastNewLine;
				i += 1;
				continue;
			}

			if (line.type === "removed") {
				const rowId = `removed-${hunkIndex}-${i}`;
				leftItems.push({ rowId, line, kind: "removed" });
				connectors.push({
					type: "removed",
					startRowId: rowId,
					endRowId: rowId,
					anchorNewLine: lastNewLine || null,
				});
				lastOldLine = line.oldLineNumber ?? lastOldLine;
				continue;
			}

			if (line.type === "added") {
				const rowId = `added-${hunkIndex}-${i}`;
				rightItems.push({
					rowId,
					line,
					kind: "added",
					anchorOldLine: lastOldLine || null,
				});
				connectors.push({
					type: "added",
					startRowId: rowId,
					endRowId: rowId,
					anchorOldLine: lastOldLine || null,
				});
				lastNewLine = line.newLineNumber ?? lastNewLine;
			}
		}

		nextOldLine = hunk.oldStart + hunk.oldLines;
		nextNewLine = hunk.newStart + hunk.newLines;
	});

	if (hasFullFiles) {
		pushGapLines(nextOldLine, totalOldLines, nextNewLine, totalNewLines);
	}

	const leftIndexMap = new Map<string, number>();
	leftItems.forEach((item, index) => {
		leftIndexMap.set(item.rowId, index);
	});

	const rightIndexMap = new Map<string, number>();
	rightItems.forEach((item, index) => {
		rightIndexMap.set(item.rowId, index);
	});

	const grouped: ConnectorMeta[] = [];
	for (const connector of connectors) {
		const last = grouped[grouped.length - 1];
		if (!last) {
			grouped.push(connector);
			continue;
		}

		const indexMap =
			connector.type === "removed" || last.type === "removed" ? leftIndexMap : rightIndexMap;
		const lastIndex = indexMap.get(last.endRowId) ?? -1;
		const currentIndex = indexMap.get(connector.startRowId) ?? -1;
		const isConsecutive = currentIndex === lastIndex + 1;

		if (isConsecutive && connector.type === "change" && last.type === "change") {
			last.endRowId = connector.endRowId;
			continue;
		}

		if (isConsecutive && connector.type === "added" && last.type === "added") {
			if (connector.anchorOldLine === last.anchorOldLine) {
				last.endRowId = connector.endRowId;
				continue;
			}
		}

		if (isConsecutive && connector.type === "removed" && last.type === "removed") {
			if (connector.anchorNewLine === last.anchorNewLine) {
				last.endRowId = connector.endRowId;
				continue;
			}
		}

		grouped.push(connector);
	}

	return { leftItems, rightItems, connectors: grouped };
}

export function SideBySideDiff({ file, oldFileLines, newFileLines }: SideBySideDiffProps) {
	if (!file || file.hunks.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-slate-400">
				No diff to display.
			</div>
		);
	}

	const { leftItems, rightItems, connectors: connectorMeta } = useMemo(
		() => buildColumns(file, oldFileLines, newFileLines),
		[file, oldFileLines, newFileLines],
	);
	const leftLineByRowId = useMemo(() => {
		const map = new Map<string, DiffLine>();
		leftItems.forEach((item) => {
			map.set(item.rowId, item.line);
		});
		return map;
	}, [leftItems]);
	const rightLineByRowId = useMemo(() => {
		const map = new Map<string, DiffLine>();
		rightItems.forEach((item) => {
			map.set(item.rowId, item.line);
		});
		return map;
	}, [rightItems]);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const contentRef = useRef<HTMLDivElement | null>(null);
	const [connectors, setConnectors] = useState<
		{
			id: string;
			fromTop: { x: number; y: number };
			fromBottom: { x: number; y: number };
			toTop: { x: number; y: number };
			toBottom: { x: number; y: number };
			curveStartX: number;
			curveEndX: number;
			color: string;
		}[]
	>([]);

	useLayoutEffect(() => {
		const container = containerRef.current;
		const content = contentRef.current;
		if (!container || !content) {
			return;
		}

		const update = () => {
			const contentBox = content.getBoundingClientRect();
			const leftColumn = content.querySelector<HTMLElement>("[data-col='left']");
			const rightColumn = content.querySelector<HTMLElement>("[data-col='right']");
			const gapColumn = content.querySelector<HTMLElement>("[data-col='gap']");
			const leftColumnBox = leftColumn?.getBoundingClientRect();
			const rightColumnBox = rightColumn?.getBoundingClientRect();
			const gapBox = gapColumn?.getBoundingClientRect();
			const fullFromX = (leftColumnBox?.left ?? contentBox.left) - contentBox.left;
			const fullToX = (rightColumnBox?.right ?? contentBox.right) - contentBox.left;
			const curveStartX =
				(gapBox?.left ?? (leftColumnBox?.right ?? contentBox.left)) - contentBox.left;
			const curveEndX =
				(gapBox?.right ?? (rightColumnBox?.left ?? contentBox.right)) - contentBox.left;

			const nextConnectors = connectorMeta
				.map((meta, index) => {
					const rightStartEl = content.querySelector<HTMLElement>(
						`[data-row-id='${meta.startRowId}'][data-side='right']`,
					);
					const rightEndEl = content.querySelector<HTMLElement>(
						`[data-row-id='${meta.endRowId}'][data-side='right']`,
					);
					if (meta.type !== "removed" && (!rightStartEl || !rightEndEl)) {
						return null;
					}

					const rightStartBox = rightStartEl?.getBoundingClientRect();
					const rightEndBox = rightEndEl?.getBoundingClientRect();
					const toX = fullToX;
					const toTop = rightStartBox ? rightStartBox.top - contentBox.top + 1 : 0;
					const toBottom = rightEndBox ? rightEndBox.bottom - contentBox.top - 1 : 0;
					const curveEnd = curveEndX;

					if (meta.type === "change") {
						const leftStartEl = content.querySelector<HTMLElement>(
							`[data-row-id='${meta.startRowId}'][data-side='left']`,
						);
						const leftEndEl = content.querySelector<HTMLElement>(
							`[data-row-id='${meta.endRowId}'][data-side='left']`,
						);
						if (!leftStartEl || !leftEndEl) {
							return null;
						}

						const leftStartBox = leftStartEl.getBoundingClientRect();
						const leftEndBox = leftEndEl.getBoundingClientRect();
						const fromTop = leftStartBox.top - contentBox.top + 1;
						const fromBottom = leftEndBox.bottom - contentBox.top - 1;
						const curveStart = curveStartX;

						return {
							id: `connector-${index}`,
							fromTop: { x: fullFromX, y: fromTop },
							fromBottom: { x: fullFromX, y: fromBottom },
							toTop: { x: toX, y: toTop },
							toBottom: { x: toX, y: toBottom },
							curveStartX: curveStart,
							curveEndX: curveEnd,
							color: "#2563eb",
						};
					}

					if (meta.type === "removed") {
						const leftStartEl = content.querySelector<HTMLElement>(
							`[data-row-id='${meta.startRowId}'][data-side='left']`,
						);
						const leftEndEl = content.querySelector<HTMLElement>(
							`[data-row-id='${meta.endRowId}'][data-side='left']`,
						);
						if (!leftStartEl || !leftEndEl) {
							return null;
						}

						const leftStartBox = leftStartEl.getBoundingClientRect();
						const leftEndBox = leftEndEl.getBoundingClientRect();
						const fromTop = leftStartBox.top - contentBox.top + 1;
						const fromBottom = leftEndBox.bottom - contentBox.top - 1;
						const curveStart = curveStartX;

						const anchorLine = meta.anchorNewLine;
						let anchorY = contentBox.top;
						if (anchorLine) {
							const anchorEl = content.querySelector<HTMLElement>(
								`[data-new-line='${anchorLine}'][data-side='right-line']`,
							);
							if (anchorEl) {
								anchorY = anchorEl.getBoundingClientRect().bottom;
							}
						}
						const toY = anchorY - contentBox.top;
						const band = 2;

						return {
							id: `connector-${index}`,
							fromTop: { x: fullFromX, y: fromTop },
							fromBottom: { x: fullFromX, y: fromBottom },
							toTop: { x: toX, y: toY - band },
							toBottom: { x: toX, y: toY + band },
							curveStartX: curveStart,
							curveEndX: curveEnd,
							color: "#dc2626",
						};
					}

					const anchorLine = meta.anchorOldLine;
					let anchorY = contentBox.top;
					if (anchorLine) {
						const anchorEl = content.querySelector<HTMLElement>(
							`[data-old-line='${anchorLine}'][data-side='left-line']`,
						);
						if (anchorEl) {
							anchorY = anchorEl.getBoundingClientRect().bottom;
						}
					}
					const fromY = anchorY - contentBox.top;
					const band = 2;
					const curveStart = curveStartX;

					return {
						id: `connector-${index}`,
						fromTop: { x: fullFromX, y: fromY - band },
						fromBottom: { x: fullFromX, y: fromY + band },
						toTop: { x: toX, y: toTop },
						toBottom: { x: toX, y: toBottom },
						curveStartX: curveStart,
						curveEndX: curveEnd,
						color: "#16a34a",
					};
				})
				.filter(
					(
						connector,
					): connector is {
							id: string;
							fromTop: { x: number; y: number };
							fromBottom: { x: number; y: number };
							toTop: { x: number; y: number };
							toBottom: { x: number; y: number };
							curveStartX: number;
							curveEndX: number;
							color: string;
						} => Boolean(connector),
				);

			setConnectors(nextConnectors);
		};

		update();
		const scrollParents = getScrollParents(container);
		scrollParents.forEach((parent) => parent.addEventListener("scroll", update));
		container.addEventListener("scroll", update);
		window.addEventListener("resize", update);
		return () => {
			scrollParents.forEach((parent) => parent.removeEventListener("scroll", update));
			container.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, [connectorMeta]);

	const renderInlineChange = (
		oldText: string,
		newText: string | null,
		showSide: "old" | "new",
		changeTone: "blue" | "green" | "red",
	) => {
		if (!newText) {
			return oldText;
		}

		const diff = buildInlineDiff(oldText, newText);
		const toneClass =
			changeTone === "blue"
				? "bg-blue-200/70 text-blue-950"
				: changeTone === "green"
					? "bg-emerald-200/70 text-emerald-950"
					: "bg-red-200/70 text-red-950";

		const target = showSide === "old" ? diff.old : diff.next;

		return (
			<>
				{target.before}
				{target.changed ? (
					<span className={`rounded-sm px-0.5 font-semibold ${toneClass}`}>
						{target.changed}
					</span>
				) : null}
				{target.after}
			</>
		);
	};

	return (
		<div
			className="relative h-auto max-h-full overflow-y-auto rounded-xl border border-slate-200 bg-white/80"
			ref={containerRef}
		>
			<div className="relative min-h-full" ref={contentRef}>
				<div className="grid grid-cols-[48px_1fr_48px_1fr] gap-x-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
					<div className="px-3 py-2">Old</div>
					<div className="px-3 py-2">Content</div>
					<div className="px-3 py-2">New</div>
					<div className="px-3 py-2">Content</div>
				</div>
				<div className="grid grid-cols-[1fr_56px_1fr] gap-x-0 px-3 pb-3 text-sm">
					<div className="space-y-1" data-col="left">
						{leftItems.map((item) => {
							const rightLine = rightLineByRowId.get(item.rowId) ?? null;
							const showInline = item.kind === "change" && rightLine;

							return (
							<div
								key={item.rowId}
								className="grid grid-cols-[48px_1fr] items-start gap-x-4"
							>
								<div
									className="text-right tabular-nums text-slate-400"
									data-side="left-line"
									data-row-id={item.rowId}
									data-old-line={item.line.oldLineNumber ?? ""}
								>
									{item.line.oldLineNumber ?? ""}
								</div>
								<div
									className={`rounded px-2 py-0.5 font-mono text-xs ${getLeftStyles(item.line)}`}
									data-side="left"
									data-row-id={item.rowId}
									data-old-line={item.line.oldLineNumber ?? ""}
									data-testid={`left-content-${item.line.oldLineNumber ?? item.rowId}`}
								>
									{showInline
										? renderInlineChange(
											item.line.content,
											rightLine?.content ?? null,
											"old",
											"red",
										)
										: item.line.content}
								</div>
							</div>
					);
					})}
					</div>
					<div className="" data-col="gap" aria-hidden="true" />
					<div className="space-y-1" data-col="right">
						{rightItems.map((item) => {
							const rightStyle = getRightStyles(item.line);
							const leftLine = leftLineByRowId.get(item.rowId) ?? null;
							const showInline = item.kind === "change" && leftLine;

							return (
								<div
									key={item.rowId}
									className="grid grid-cols-[48px_1fr] items-start gap-x-4"
								>
									<div
										className="text-right tabular-nums text-slate-400"
										data-side="right-line"
										data-row-id={item.rowId}
										data-new-line={item.line.newLineNumber ?? ""}
									>
										{item.line.newLineNumber ?? ""}
									</div>
									<div
										className={`rounded px-2 py-0.5 font-mono text-xs ${rightStyle}`}
										data-side="right"
										data-row-id={item.rowId}
										data-testid={`right-content-${item.line.newLineNumber ?? item.rowId}`}
									>
										{showInline
											? renderInlineChange(
												leftLine?.content ?? "",
												item.line.content,
												"new",
												"green",
											)
											: item.line.content}
									</div>
								</div>
							);
						})}
					</div>
				</div>
				<DiffConnectors connectors={connectors} />
			</div>
		</div>
	);
}
