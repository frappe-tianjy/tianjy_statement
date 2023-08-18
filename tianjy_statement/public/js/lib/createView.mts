import Handsontable from 'handsontable';
import HyperFormula from 'hyperformula';

import customStylesRenderer from '../lib/customStylesRenderer.mjs';

import rendererStyleMenu from './rendererStyleMenu.mjs';

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
		contextMenu: {
			items: {
				row_above: {},
				row_below: {},
				hr0: '---------',
				col_left: {},
				col_right: {},
				hr1: '---------',
				remove_row: {},
				remove_col: {},
				hr2: '---------',
				undo: {},
				redo: {},
				hr3: '---------',
				alignment: {},
				hr5: '---------',
				copy: {},
				cut: {},
				hr6: '---------',
				mergeCells: {},
				hr7: '---------',
				style: {
					renderer() {
						return rendererStyleMenu(table);
					},
					disableSelection: false,
					isCommand: true,
				},
			},
		},
		language: 'zh-CN',
		renderer: customStylesRenderer,
		licenseKey: 'non-commercial-and-evaluation',
		formulas: { engine: HyperFormula },
	});
	return table;

}
