import type Handsontable from 'handsontable';

import type { Template, TemplateStyle } from '../types.mjs';


function getStyles(hot: Handsontable) {

	const styles: TemplateStyle[][] = [];
	for (const meta of hot.getCellsMeta()) {
		const { row, col, bold, color, bgColor, italic, underline, className } = meta;
		while (styles.length <= row) { styles.push([]); }
		const style: TemplateStyle = {};
		if (bold) { style.bold = 1; }
		if (italic) { style.italic = 1; }
		if (underline) { style.underline = 1; }
		if (color) { style.color = color; }
		if (bgColor) { style.bgColor = bgColor; }
		const cname = (Array.isArray(className) ? className.join(' ') : className || '').split(' ');
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
	}
	return styles;
}


export default function readValue(
	handsontable: Handsontable,
	hasValue?: boolean,
): Template {
	const data = handsontable.getSourceData().map(v => [...v as any]);
	const maxCol = data.reduce((m, v) => Math.max(m, v.length), 0);
	const maxRow = data.length;
	return {
		data,
		value: hasValue && handsontable.getData().map((v: any) => [...v as any]) || undefined,
		styles: getStyles(handsontable),
		merged: handsontable.getPlugin('mergeCells')
			// @ts-ignore
			?.mergedCellsCollection
			// @ts-ignore
			.mergedCells.map(v => ({ ...v })) || [],
		widths: Array(maxCol).fill(0).map((_, i) => handsontable.getColWidth(i)),
		heights: Array(maxRow).fill(0).map((_, i) => handsontable.getRowHeight(i)),
	};
}
