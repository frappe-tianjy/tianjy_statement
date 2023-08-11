import Handsontable from 'handsontable';
import HyperFormula from 'hyperformula';

import customStylesRenderer from '../lib/customStylesRenderer.mjs';

export default function createView(
	el: HTMLElement,
	height: string,
) {
	const table: Handsontable = new Handsontable(el, {
		startRows: 8,
		startCols: 6,
		rowHeaders: true,
		colHeaders: true,
		height,
		manualColumnResize: true,
		manualRowResize: true,
		language: 'zh-CN',
		renderer: customStylesRenderer,
		licenseKey: 'non-commercial-and-evaluation',
		formulas: { engine: HyperFormula },
	});
	return table;

}
