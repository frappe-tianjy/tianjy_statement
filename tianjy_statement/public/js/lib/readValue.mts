import type Handsontable from 'handsontable';

import type { Template, TemplateStyle } from '../types.mjs';

function* getXY(width: number, height: number): Iterable<[number, number]> {
	for (let x =0; x < width; x++) {
		for (let y =0; y < height; y++) {
			yield [x, y];
		}
	}
}

function getStyles(hot: Handsontable, width: number, height: number) {

	const styles: TemplateStyle[][] = [];
	for (const [x, y] of getXY(width, height)) {
		try {
			const {
				row, col, bold, color, bgColor, italic, underline, className, fontSize,
			} = hot.getCellMeta(y, x);
			while (styles.length <= row) { styles.push([]); }
			const style: TemplateStyle = {};
			if (bold) { style.bold = 1; }
			if (italic) { style.italic = 1; }
			if (underline) { style.underline = 1; }
			if (color) { style.color = color; }
			if (bgColor) { style.bgColor = bgColor; }
			if (fontSize) { style.fontSize = fontSize; }
			const cname = (
				Array.isArray(className) ? className.join(' ') : className || ''
			).split(' ');
			if (cname.includes('htLeft')) {
				style.left = 1;
			} else if (cname.includes('htCenter')) {
				style.center = 1;
			} else if (cname.includes('htRight')) {
				style.right = 1;
			} else if (cname.includes('htJustify')) {
				style.justify = 1;
			}
			if (cname.includes('htTop')) {
				style.top = 1;
			} else if (cname.includes('htMiddle')) {
				style.middle = 1;
			} else if (cname.includes('htBottom')) {
				style.bottom = 1;
			}
			styles[row][col] = style;
		} catch (e) {
			console.error(e);
		}
	}
	return styles;
}


export default function readValue(
	handsontable: Handsontable,
	hasValue?: boolean,
): Template {
	const settings = handsontable.getSettings();
	const data = handsontable.getSourceData().map(v => [...v as any]);
	const maxCol = data.reduce((m, v) => Math.max(m, v.length), 0);
	const maxRow = data.length;
	return {
		data,
		value: hasValue && handsontable.getData().map((v: any) => [...v as any]) || undefined,
		styles: getStyles(handsontable, maxCol, maxRow),
		freezeRow: settings.fixedRowsTop,
		freezeCol: settings.fixedColumnsStart,
		merged: handsontable.getPlugin('mergeCells')
			// @ts-ignore
			?.mergedCellsCollection
			// @ts-ignore
			.mergedCells.map(v => ({ ...v })) || [],
		widths: Array(maxCol).fill(0).map((_, i) => handsontable.getColWidth(i)),
		heights: Array(maxRow).fill(0).map((_, i) => handsontable.getRowHeight(i)),
	};
}
