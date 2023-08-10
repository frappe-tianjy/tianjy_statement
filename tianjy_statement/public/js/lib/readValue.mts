import type Handsontable from 'handsontable';

import type { Template } from '../types.mjs';

export default function readValue(
	handsontable: Handsontable,
): Template {
	const data = handsontable.getSourceData().map(v => [...v as any]);
	const maxCol = data.reduce((m, v) => Math.max(m, v.length), 0);
	const maxRow = data.length;
	return {
		data,
		merged: handsontable.getPlugin('mergeCells')
			// @ts-ignore
			?.mergedCellsCollection
			// @ts-ignore
			.mergedCells.map(v => ({ ...v })) || [],
		widths: Array(maxCol).fill(0).map((_, i) => handsontable.getColWidth(i)),
		heights: Array(maxRow).fill(0).map((_, i) => handsontable.getRowHeight(i)),
	};
}
