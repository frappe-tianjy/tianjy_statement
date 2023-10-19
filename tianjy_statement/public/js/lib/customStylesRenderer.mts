import Handsontable from 'handsontable';

export function stylesRenderer(
	hotInstance: Handsontable.Core,
	TD: HTMLTableCellElement,
	row: number,
	col: number,
	prop: string | number,
	value: any,
	cellProperties: Handsontable.CellProperties,
) {
	const { bold, italic, underline, color, bgColor, fontSize } = cellProperties;
	if (bold) { TD.style.fontWeight = 'bold'; }
	if (italic) { TD.style.fontStyle = 'italic'; }
	if (underline) { TD.style.textDecoration = 'underline'; }
	if (color) { TD.style.color = color; }
	if (bgColor) { TD.style.backgroundColor = bgColor; }
	if (fontSize) { TD.style.fontSize = fontSize; }
}


export default function customStylesRenderer() {
	Handsontable.renderers.TextRenderer(...arguments);
	stylesRenderer(...arguments);
}

export function bindStyleRenderer(Renderer: any) {
	return function () {
		Renderer(...arguments);
		stylesRenderer(...arguments);
	};
}
export const renderers: Record<string, any> = {
	numeric: bindStyleRenderer(Handsontable.renderers.NumericRenderer),
	text: bindStyleRenderer(Handsontable.renderers.TextRenderer),
};


export function getRenderer(type?: string) {
	return type && type in renderers && renderers[type] || customStylesRenderer;
}
