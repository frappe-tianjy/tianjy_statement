import Handsontable from 'handsontable';

export default function customStylesRenderer(
	hotInstance: Handsontable.Core,
	TD: HTMLTableCellElement,
	row: number,
	col: number,
	prop: string | number,
	value: any,
	cellProperties: Handsontable.CellProperties,
) {
	Handsontable.renderers.TextRenderer(hotInstance, TD, row, col, prop, value, cellProperties);
	const { bold, italic, underline, color, bgColor } = cellProperties;
	if (bold) { TD.style.fontWeight = 'bold'; }
	if (italic) { TD.style.fontStyle = 'italic'; }
	if (underline) { TD.style.textDecoration = 'underline'; }
	if (color) { TD.style.color = color; }
	if (bgColor) { TD.style.backgroundColor = bgColor; }
}
