import Handsontable from 'handsontable';
import HyperFormula from 'hyperformula';

import { Template } from '../types.mjs';

import customStylesRenderer from './customStylesRenderer.mjs';
import rendererStyleMenu from './rendererStyleMenu.mjs';
import readValue from './readValue.mjs';

export default function createEditor(
	el: HTMLElement,
	height: string,
	namedExpressions: any[] = [],
	cb: (template: Template) => void,
) {
	const table: Handsontable = new Handsontable(el, {
		startRows: 8,
		startCols: 6,
		rowHeaders: true,
		colHeaders: true,
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
				make_read_only: {},
				hr4: '---------',
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
		manualColumnResize: true,
		manualRowResize: true,
		manualColumnFreeze: true,
		manualRowFreeze: true,
		mergeCells: [],
		height,
		language: 'zh-CN',
		renderer: customStylesRenderer,
		licenseKey: 'non-commercial-and-evaluation',
		// @ts-ignore
		formulas: { engine: HyperFormula, namedExpressions },
	});
	let timeout: any;
	const update = () => {
		clearTimeout(timeout);
		timeout = setTimeout(() => { cb(readValue(table)); }, 0);
	};
	table.updateSettings({
		afterMergeCells: update,
		afterUnmergeCells: update,
		afterColumnResize: update,
		afterRowResize: update,
		afterChange: update,
		afterSetCellMeta: update,
	});
	return table;

}
