import type Handsontable from 'handsontable';

import type { BorderOptions, Template, TemplateBorder, TemplateStyle } from '../types.mjs';

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

const colorRegex = /^#[\da-f]{6}$|^#[\da-f]{3}$/i;

function getBorder(v?: string | {
	hide?: boolean;
	color?: string;
	width?: number
}): BorderOptions | undefined {
	if (!v) { return; }

	if (typeof v === 'string') {
		const color = v;
		if (!colorRegex.test(color)) { return; }
		return {color};
	}
	if (typeof v !== 'object') { return; }
	if (v.hide) { return; }
	if (!v.width) { return; }
	if (!v.color) { return; }
	const {color} = v;
	if (!colorRegex.test(color)) { return; }
	return {color};

}

function getBorders(handsontable: Handsontable) {
	// @ts-ignore
	const list: any[] = handsontable.getPlugin('customBorders')?.getBorders() || [];

	const borders: TemplateBorder[] = [];
	for (const {row, col, ...b} of list) {
		const border: TemplateBorder = { row, col };
		let has = false;
		for (const k of ['left', 'right', 'top', 'bottom'] as const) {
			const v = getBorder(b[k]);
			if (!v) { continue; }
			has = true;
			border[k] = v;
		}
		if (!has) { continue; }
		borders.push(border);
	}
	return borders;
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
		borders: getBorders(handsontable),
		merged: handsontable.getPlugin('mergeCells')
			// @ts-ignore
			?.mergedCellsCollection
			// @ts-ignore
			.mergedCells.map(v => ({ ...v })) || [],
		widths: Array(maxCol).fill(0).map((_, i) => handsontable.getColWidth(i)),
		heights: Array(maxRow).fill(0).map((_, i) => handsontable.getRowHeight(i)),
	};
}
