// ============================================================
// DIFF VIEWER SCROLL + ALIGNMENT MODEL (JetBrains-style)
// Scenario:
// - Original file: 20 lines
// - 5 lines inserted after line 2
// - Lines 16,17,18 deleted
//
// Goal:
// Keep matching lines aligned visually while scrolling,
// by inserting synthetic spacer blocks on the shorter side.
// ============================================================



// ------------------------------------------------------------
// STEP 1: Build a Unified Visual Diff Model
// ------------------------------------------------------------

// Create a single ordered list of visual rows representing
// the diff structure from top to bottom.
//
// Each row is one of:
//   - MATCH        (leftLine <-> rightLine)
//   - INSERT_BLOCK (right-only lines)
//   - DELETE_BLOCK (left-only lines)
//
// This model defines scroll order and visual layout.
// DO NOT let left and right editors compute layout independently.
//
// Example structure for this scenario:
//
// [
//   { type: MATCH, left:1, right:1 },
//   { type: MATCH, left:2, right:2 },
//   { type: INSERT_BLOCK, count:5 },   // after line 2
//   { type: MATCH, left:3, right:3 },
//   ...
//   { type: MATCH, left:15, right:15 },
//   { type: DELETE_BLOCK, count:3 },   // lines 16-18
//   { type: MATCH, left:19, right:19 },
//   { type: MATCH, left:20, right:20 }
// ]
//
// This unified structure drives:
// - Scroll height
// - Line alignment
// - Connector rendering
// ------------------------------------------------------------



// ------------------------------------------------------------
// STEP 2: Compute Visual Row Heights
// ------------------------------------------------------------

// Each MATCH row height = max(height(leftLine), height(rightLine))
//
// Each INSERT_BLOCK:
//   - Right side renders real lines
//   - Left side renders spacer rows of equal height
//
// Each DELETE_BLOCK:
//   - Left side renders real lines
//   - Right side renders spacer rows of equal height
//
// IMPORTANT:
// Spacer rows must occupy the SAME pixel height as
// the real lines on the opposite side.
//
// This ensures matching lines below the block re-align.
//
// Example:
// If 5 lines inserted on right,
// insert a 5-line spacer block on left.
// ------------------------------------------------------------



// ------------------------------------------------------------
// STEP 3: Maintain Scroll Through Unified Visual Space
// ------------------------------------------------------------

// The scroll position maps to a visualRowIndex,
// NOT directly to left or right line numbers.
//
// Pseudocode:
//
// scrollY -> find first visible visualRow
//
// Then for each visible visualRow:
//   renderLeftRow()
//   renderRightRow()
//
// Both sides derive layout from the SAME visualRowIndex.
//
// This prevents cumulative drift.
// ------------------------------------------------------------



// ------------------------------------------------------------
// STEP 4: Alignment Logic Through Insert Region
// ------------------------------------------------------------

// When scrolling through insertion block:
//
// RIGHT:
//   render new lines normally
//
// LEFT:
//   render blank spacer rows
//
// The spacer height equals total inserted height.
//
// Effect while scrolling:
//   - Right side content moves normally
//   - Left side shows empty vertical gap
//   - Lines below insertion stay aligned
//
// Critical invariant:
// visualY(left line 3) == visualY(right line 3)
// ------------------------------------------------------------



// ------------------------------------------------------------
// STEP 5: Alignment Logic Through Delete Region
// ------------------------------------------------------------

// When scrolling through deletion block:
//
// LEFT:
//   render deleted lines normally (highlight red)
//
// RIGHT:
//   render blank spacer rows
//
// Spacer height equals total deleted height.
//
// Effect:
//   - Left side scrolls real content
//   - Right side scrolls blank vertical region
//   - Lines 19 and 20 re-align perfectly below block
//
// Never allow deletion to permanently shift alignment.
// ------------------------------------------------------------



// ------------------------------------------------------------
// STEP 6: Cumulative Offset Neutralization
// ------------------------------------------------------------

// Track logical offsets:
//
// cumulativeDelta = insertedLines - deletedLines
//
// DO NOT apply cumulativeDelta directly to layout.
//
// Instead:
//   Immediately neutralize each diff block
//   with a spacer block of equal height.
//
// This prevents alignment drift.
//
// Visual alignment is restored immediately
// after each INSERT or DELETE block.
// ------------------------------------------------------------



// ------------------------------------------------------------
// STEP 7: Connector Rendering (Curved Beziers)
// ------------------------------------------------------------

// For each diff block, render connectors dynamically.
//
// Every frame (during scroll):
//
//   yLeft  = getVisualY(leftLine or blockTop)
//   yRight = getVisualY(rightLine or blockTop)
//
//   Draw cubic bezier between:
//
//     start  = (leftEditorWidth, yLeft)
//     end    = (0, yRight)
//
//     control1 = (leftEditorWidth + curveOffset, yLeft)
//     control2 = (-curveOffset, yRight)
//
// IMPORTANT:
// Do not cache Y positions.
// Recompute every frame so curves stretch/compress smoothly
// during scrolling.
//
// Insert blocks:
//   Connect left line 2 -> entire right block region.
//
// Delete blocks:
//   Connect entire left block region -> right line 15.
// ------------------------------------------------------------



// ------------------------------------------------------------
// STEP 8: Scrolling Behaviour Over Time
// ------------------------------------------------------------

// As user scrolls downward:
//
// 1. Lines 1–2 aligned normally.
// 2. Insert block enters view:
//      Right shows 5 new lines.
//      Left shows 5-line spacer.
//      Connector expands vertically.
// 3. Insert block exits view:
//      Alignment restored.
// 4. Middle region scrolls normally.
// 5. Delete block enters view:
//      Left shows lines 16–18.
//      Right shows spacer.
//      Connector stretches again.
// 6. Delete block exits view:
//      Lines 19–20 aligned perfectly.
//
// Because layout is unified,
// there is never cumulative vertical drift.
// ------------------------------------------------------------



// ------------------------------------------------------------
// STEP 9: Rendering Invariants
// ------------------------------------------------------------

// MUST HOLD TRUE:
//
// 1. Matching lines always share identical visual Y.
// 2. Spacer height equals opposing block height.
// 3. Scroll position references unified model.
// 4. Connectors are derived from visual positions.
// 5. Layout recalculates per frame during scroll.
//
// If any of these break,
// alignment artifacts will appear.
// ------------------------------------------------------------



// ============================================================
// END RESULT
// ============================================================
//
// The viewer feels "elastic":
// - Insertions expand one side
// - Deletions expand the other
// - Matching lines below always snap back into alignment
// - Connectors stretch smoothly while scrolling
//
// The key is unified visual rows + spacer neutralization.
// ============================================================


import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { DiffFile, DiffLine } from "../../shared/diff/model";
import { DiffConnectors } from "./DiffConnectors";

export type SideBySideDiffProps = {
	file: DiffFile | null;
	oldFileLines?: string[];
	newFileLines?: string[];
};


type LeftCell =
	| { kind: "context"; line: DiffLine }
	| { kind: "removed"; line: DiffLine }
	| { kind: "change"; line: DiffLine }
	| { kind: "spacer" };

type RightCell =
	| { kind: "context"; line: DiffLine; anchorOldLine: number | null }
	| { kind: "added"; line: DiffLine; anchorOldLine: number | null }
	| { kind: "change"; line: DiffLine; anchorOldLine: number | null }
	| { kind: "spacer" };

type VisualRow = {
	rowId: string;
	left: LeftCell;
	right: RightCell;
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

const ROW_HEIGHT = 24;

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

function buildVisualRows(
	file: DiffFile,
	oldFileLines?: string[],
	newFileLines?: string[],
): {
	rows: VisualRow[];
	connectors: ConnectorMeta[];
} {
	const rows: VisualRow[] = [];
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
		rows.push({
			rowId,
			left: { kind: "context", line },
			right: { kind: "context", line, anchorOldLine: null },
		});
		lastOldLine = oldLineNumber;
		lastNewLine = newLineNumber;
	};

	const pushRemovedRow = (rowId: string, content: string, oldLineNumber: number) => {
		const line: DiffLine = { type: "removed", content, oldLineNumber };
		rows.push({
			rowId,
			left: { kind: "removed", line },
			right: { kind: "spacer" },
		});
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
		rows.push({
			rowId,
			left: { kind: "spacer" },
			right: { kind: "added", line, anchorOldLine: lastOldLine || null },
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
				rows.push({
					rowId,
					left: { kind: "context", line },
					right: { kind: "context", line, anchorOldLine: null },
				});
				lastOldLine = line.oldLineNumber ?? lastOldLine;
				lastNewLine = line.newLineNumber ?? lastNewLine;
				continue;
			}

			if (line.type === "removed" && next?.type === "added") {
				const rowId = `change-${hunkIndex}-${i}`;
				rows.push({
					rowId,
					left: { kind: "change", line },
					right: { kind: "change", line: next, anchorOldLine: null },
				});
				connectors.push({ type: "change", startRowId: rowId, endRowId: rowId });
				lastOldLine = line.oldLineNumber ?? lastOldLine;
				lastNewLine = next.newLineNumber ?? lastNewLine;
				i += 1;
				continue;
			}

			if (line.type === "added" && next?.type === "removed") {
				const rowId = `change-${hunkIndex}-${i}`;
				rows.push({
					rowId,
					left: { kind: "change", line: next },
					right: { kind: "change", line, anchorOldLine: null },
				});
				connectors.push({ type: "change", startRowId: rowId, endRowId: rowId });
				lastOldLine = next.oldLineNumber ?? lastOldLine;
				lastNewLine = line.newLineNumber ?? lastNewLine;
				i += 1;
				continue;
			}

			if (line.type === "removed") {
				const rowId = `removed-${hunkIndex}-${i}`;
				rows.push({
					rowId,
					left: { kind: "removed", line },
					right: { kind: "spacer" },
				});
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
				rows.push({
					rowId,
					left: { kind: "spacer" },
					right: { kind: "added", line, anchorOldLine: lastOldLine || null },
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

	const rowIndexMap = new Map<string, number>();
	rows.forEach((row, index) => {
		rowIndexMap.set(row.rowId, index);
	});

	const grouped: ConnectorMeta[] = [];
	for (const connector of connectors) {
		const last = grouped[grouped.length - 1];
		if (!last) {
			grouped.push(connector);
			continue;
		}

		const lastIndex = rowIndexMap.get(last.endRowId) ?? -1;
		const currentIndex = rowIndexMap.get(connector.startRowId) ?? -1;
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

	return { rows, connectors: grouped };
}

export function SideBySideDiff({ file, oldFileLines, newFileLines }: SideBySideDiffProps) {
	if (!file || file.hunks.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-slate-400">
				No diff to display.
			</div>
		);
	}

	const { rows, connectors: connectorMeta } = useMemo(
		() => buildVisualRows(file, oldFileLines, newFileLines),
		[file, oldFileLines, newFileLines],
	);

	// Derive per-side content arrays (no spacers) and scroll-mapping tables
	const {
		leftContentItems,
		rightContentItems,
		leftRunning,
		rightRunning,
		rowIdToLeftIdx,
		rowIdToRightIdx,
		oldLineToLeftIdx,
		newLineToRightIdx,
	} = useMemo(() => {
		type LeftContentItem = {
			rowId: string;
			cell: Exclude<LeftCell, { kind: "spacer" }>;
			rightCell: RightCell;
		};
		type RightContentItem = {
			rowId: string;
			cell: Exclude<RightCell, { kind: "spacer" }>;
			leftCell: LeftCell;
		};
		const leftItems: LeftContentItem[] = [];
		const rightItems: RightContentItem[] = [];
		const lRun: number[] = [];
		const rRun: number[] = [];
		const r2l = new Map<string, number>();
		const r2r = new Map<string, number>();
		const o2l = new Map<number, number>();
		const n2r = new Map<number, number>();
		let lc = 0;
		let rc = 0;

		for (const row of rows) {
			lRun.push(lc);
			rRun.push(rc);
			if (row.left.kind !== "spacer") {
				leftItems.push({ rowId: row.rowId, cell: row.left, rightCell: row.right });
				r2l.set(row.rowId, lc);
				if (row.left.line.oldLineNumber != null) {
					o2l.set(row.left.line.oldLineNumber, lc);
				}
				lc++;
			}
			if (row.right.kind !== "spacer") {
				rightItems.push({ rowId: row.rowId, cell: row.right, leftCell: row.left });
				r2r.set(row.rowId, rc);
				if (row.right.line.newLineNumber != null) {
					n2r.set(row.right.line.newLineNumber, rc);
				}
				rc++;
			}
		}

		return {
			leftContentItems: leftItems,
			rightContentItems: rightItems,
			leftRunning: lRun,
			rightRunning: rRun,
			rowIdToLeftIdx: r2l,
			rowIdToRightIdx: r2r,
			oldLineToLeftIdx: o2l,
			newLineToRightIdx: n2r,
		};
	}, [rows]);

	const totalUnifiedHeight = rows.length * ROW_HEIGHT;

	const containerRef = useRef<HTMLDivElement | null>(null);
	const panesRef = useRef<HTMLDivElement | null>(null);
	const [scrollTop, setScrollTop] = useState(0);
	const [viewportHeight, setViewportHeight] = useState(0);
	const [layoutX, setLayoutX] = useState({
		fullFromX: 0,
		fullToX: 0,
		curveStartX: 0,
		curveEndX: 0,
	});

	// Compute per-side scroll offsets from the unified scroll position
	const computeOffsets = useCallback(
		(st: number) => {
			if (rows.length === 0) return { leftScrollY: 0, rightScrollY: 0 };
			const unifiedRow = st / ROW_HEIGHT;
			const idx = Math.max(0, Math.min(Math.floor(unifiedRow), rows.length - 1));
			const frac = Math.max(0, unifiedRow - idx);
			const lBase = (leftRunning[idx] ?? 0) * ROW_HEIGHT;
			const rBase = (rightRunning[idx] ?? 0) * ROW_HEIGHT;
			return {
				leftScrollY: lBase + (rows[idx].left.kind !== "spacer" ? frac * ROW_HEIGHT : 0),
				rightScrollY: rBase + (rows[idx].right.kind !== "spacer" ? frac * ROW_HEIGHT : 0),
			};
		},
		[rows, leftRunning, rightRunning],
	);

	const { leftScrollY, rightScrollY } = computeOffsets(scrollTop);

	// Compute connectors mathematically from row indices and scroll offsets
	const connectors = useMemo(() => {
		const { fullFromX, fullToX, curveStartX, curveEndX } = layoutX;
		if (fullToX === 0) return [];

		return connectorMeta
			.map((meta, index) => {
				if (meta.type === "change") {
					const ls = rowIdToLeftIdx.get(meta.startRowId);
					const le = rowIdToLeftIdx.get(meta.endRowId);
					const rs = rowIdToRightIdx.get(meta.startRowId);
					const re = rowIdToRightIdx.get(meta.endRowId);
					if (ls == null || le == null || rs == null || re == null) return null;
					return {
						id: `connector-${index}`,
						fromTop: { x: fullFromX, y: ls * ROW_HEIGHT - leftScrollY + 1 },
						fromBottom: { x: fullFromX, y: (le + 1) * ROW_HEIGHT - leftScrollY - 1 },
						toTop: { x: fullToX, y: rs * ROW_HEIGHT - rightScrollY + 1 },
						toBottom: { x: fullToX, y: (re + 1) * ROW_HEIGHT - rightScrollY - 1 },
						curveStartX,
						curveEndX,
						color: "#2563eb",
					};
				}

				if (meta.type === "removed") {
					const ls = rowIdToLeftIdx.get(meta.startRowId);
					const le = rowIdToLeftIdx.get(meta.endRowId);
					if (ls == null || le == null) return null;
					const anchorLine = meta.anchorNewLine;
					let toY = 0;
					if (anchorLine != null) {
						const ai = newLineToRightIdx.get(anchorLine);
						if (ai != null) toY = (ai + 1) * ROW_HEIGHT - rightScrollY;
					}
					const band = 2;
					return {
						id: `connector-${index}`,
						fromTop: { x: fullFromX, y: ls * ROW_HEIGHT - leftScrollY + 1 },
						fromBottom: { x: fullFromX, y: (le + 1) * ROW_HEIGHT - leftScrollY - 1 },
						toTop: { x: fullToX, y: toY - band },
						toBottom: { x: fullToX, y: toY + band },
						curveStartX,
						curveEndX,
						color: "#dc2626",
					};
				}

				// added
				const rs = rowIdToRightIdx.get(meta.startRowId);
				const re = rowIdToRightIdx.get(meta.endRowId);
				if (rs == null || re == null) return null;
				const anchorLine = meta.anchorOldLine;
				let fromY = 0;
				if (anchorLine != null) {
					const ai = oldLineToLeftIdx.get(anchorLine);
					if (ai != null) fromY = (ai + 1) * ROW_HEIGHT - leftScrollY;
				}
				const band = 2;
				return {
					id: `connector-${index}`,
					fromTop: { x: fullFromX, y: fromY - band },
					fromBottom: { x: fullFromX, y: fromY + band },
					toTop: { x: fullToX, y: rs * ROW_HEIGHT - rightScrollY + 1 },
					toBottom: { x: fullToX, y: (re + 1) * ROW_HEIGHT - rightScrollY - 1 },
					curveStartX,
					curveEndX,
					color: "#16a34a",
				};
			})
			.filter((c): c is NonNullable<typeof c> => c !== null);
	}, [
		connectorMeta,
		leftScrollY,
		rightScrollY,
		layoutX,
		rowIdToLeftIdx,
		rowIdToRightIdx,
		oldLineToLeftIdx,
		newLineToRightIdx,
	]);

	// Measure viewport height and column X positions for connectors
	useLayoutEffect(() => {
		const container = containerRef.current;
		const panes = panesRef.current;
		if (!container || !panes) return;

		const measure = () => {
			setViewportHeight(container.clientHeight);
			const leftCol = panes.querySelector<HTMLElement>("[data-col='left']");
			const rightCol = panes.querySelector<HTMLElement>("[data-col='right']");
			const gapCol = panes.querySelector<HTMLElement>("[data-col='gap']");
			const panesBox = panes.getBoundingClientRect();
			const leftBox = leftCol?.getBoundingClientRect();
			const rightBox = rightCol?.getBoundingClientRect();
			const gapBox = gapCol?.getBoundingClientRect();

			setLayoutX({
				fullFromX: (leftBox?.left ?? panesBox.left) - panesBox.left,
				fullToX: (rightBox?.right ?? panesBox.right) - panesBox.left,
				curveStartX:
					(gapBox?.left ?? (leftBox?.right ?? panesBox.left)) - panesBox.left,
				curveEndX:
					(gapBox?.right ?? (rightBox?.left ?? panesBox.right)) - panesBox.left,
			});
		};

		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(container);
		return () => ro.disconnect();
	}, []);

	const handleScroll = useCallback(() => {
		const el = containerRef.current;
		if (el) setScrollTop(el.scrollTop);
	}, []);

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

	const stickyHeight =
		viewportHeight > 0
			? Math.min(totalUnifiedHeight, viewportHeight)
			: totalUnifiedHeight;

	return (
		<div
			className="relative max-h-full overflow-y-auto rounded-xl border border-slate-200 bg-white/80"
			ref={containerRef}
			onScroll={handleScroll}
		>
			<div style={{ height: totalUnifiedHeight }}>
				<div
					className="sticky top-0 flex flex-col overflow-hidden bg-white/80"
					style={{ height: stickyHeight }}
				>
					{/* Header */}
					<div className="shrink-0 grid grid-cols-[1fr_56px_1fr] gap-x-0 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
						<div className="grid grid-cols-[48px_1fr] gap-x-4 px-3">
							<div className="py-2">Old</div>
							<div className="py-2">Content</div>
						</div>
						<div />
						<div className="grid grid-cols-[48px_1fr] gap-x-4 px-3">
							<div className="py-2">New</div>
							<div className="py-2">Content</div>
						</div>
					</div>

					{/* Dual panes */}
					<div
						ref={panesRef}
						className="relative flex-1 min-h-0 grid grid-cols-[1fr_56px_1fr] gap-x-0 px-3"
					>
						{/* Left pane - only real left lines, translated by leftScrollY */}
						<div className="overflow-hidden" data-col="left">
							<div style={{ transform: `translateY(${-leftScrollY}px)` }}>
								{leftContentItems.map((item) => {
									const showInline =
										item.cell.kind === "change" && item.rightCell.kind === "change";
									return (
										<div
											key={item.rowId}
											className="grid grid-cols-[48px_1fr] items-center gap-x-4"
											style={{ height: ROW_HEIGHT }}
										>
											<div
												className="text-right tabular-nums text-slate-400"
												data-side="left-line"
												data-row-id={item.rowId}
												data-old-line={item.cell.line.oldLineNumber ?? ""}
											>
												{item.cell.line.oldLineNumber ?? ""}
											</div>
											<div
												className={`truncate rounded px-2 py-0.5 font-mono text-xs ${getLeftStyles(item.cell.line)}`}
												data-side="left"
												data-row-id={item.rowId}
												data-old-line={item.cell.line.oldLineNumber ?? ""}
												data-testid={`left-content-${item.cell.line.oldLineNumber ?? item.rowId}`}
											>
												{showInline
													? renderInlineChange(
															item.cell.line.content,
															item.rightCell.kind === "change"
																? item.rightCell.line.content
																: null,
															"old",
															"red",
														)
													: item.cell.line.content}
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Gap */}
						<div data-col="gap" aria-hidden="true" />

						{/* Right pane - only real right lines, translated by rightScrollY */}
						<div className="overflow-hidden" data-col="right">
							<div style={{ transform: `translateY(${-rightScrollY}px)` }}>
								{rightContentItems.map((item) => {
									const showInline =
										item.cell.kind === "change" && item.leftCell.kind === "change";
									return (
										<div
											key={item.rowId}
											className="grid grid-cols-[48px_1fr] items-center gap-x-4"
											style={{ height: ROW_HEIGHT }}
										>
											<div
												className="text-right tabular-nums text-slate-400"
												data-side="right-line"
												data-row-id={item.rowId}
												data-new-line={item.cell.line.newLineNumber ?? ""}
											>
												{item.cell.line.newLineNumber ?? ""}
											</div>
											<div
												className={`truncate rounded px-2 py-0.5 font-mono text-xs ${getRightStyles(item.cell.line)}`}
												data-side="right"
												data-row-id={item.rowId}
												data-testid={`right-content-${item.cell.line.newLineNumber ?? item.rowId}`}
											>
												{showInline
													? renderInlineChange(
															item.leftCell.kind === "change"
																? item.leftCell.line.content
																: "",
															item.cell.line.content,
															"new",
															"green",
														)
													: item.cell.line.content}
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Connector overlay */}
						<DiffConnectors connectors={connectors} />
					</div>
				</div>
			</div>
		</div>
	);
}
