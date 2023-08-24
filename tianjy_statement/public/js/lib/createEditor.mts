import Handsontable from 'handsontable';
import HyperFormula from 'hyperformula';

import type { Template } from '../types.mjs';

import customStylesRenderer from './customStylesRenderer.mjs';
import rendererStyleMenu from './rendererStyleMenu.mjs';
import readValue from './readValue.mjs';

function getStartRange(table: Handsontable): [number, number] | null {
	const ranges = table.getSelectedRange();
	if (ranges?.length !== 1) { return null; }
	const [s] = ranges;
	if (!s) { return null; }
	const {from, to} = s;
	const col = Math.min(from.col, to.col);
	const row = Math.min(from.row, to.row);
	return [Math.max(col, 0), Math.max(row, 0)];

}

export default function createEditor(
	el: HTMLElement,
	height: string,
	namedExpressions: any[] = [],
	cb?: (template: Template) => void,
) {
	el.style.overscrollBehavior = 'contain';
	el.style.isolation = 'isolate';
	const table: Handsontable = new Handsontable(el, {
		startRows: 8,
		startCols: 6,
		rowHeaders: true,
		colHeaders: true,
		contextMenu: {
			items: {
				row_above: {},
				row_below: {},
				hr0: '---------' as any,
				col_left: {},
				col_right: {},
				hr1: '---------' as any,
				remove_row: {},
				remove_col: {},
				hr2: '---------' as any,
				undo: {},
				redo: {},
				hr3: '---------' as any,
				alignment: {},
				hr4: '---------' as any,

				freeze: {
					name() {
						const range = getStartRange(this);
						if (!range) { return '冻结到此处'; }
						const [col, row] = range;
						if (!col && !row) { return '解除冻结'; }
						return '冻结到此处';
					},
					disabled() {
						return !getStartRange(this);
					},
					callback(key, selection, clickEvent) {
						const range = getStartRange(this);
						if (!range) { return; }
						const [col, row] = range;
						this.updateSettings({
							fixedColumnsStart: col,
							fixedRowsTop: row,
						});
						const s = this.getSettings();
						Object.defineProperty(s, 'freeze', {
							configurable: true,
							get() { return [col, row]; },
							enumerable: true,
						});
						this.runHooks('afterCellFreeze' as any);
					},
				},
				hr5: '---------' as any,
				copy: {},
				cut: {},
				hr6: '---------' as any,
				mergeCells: {},
				hr7: '---------' as any,
				style: {
					renderer() {
						return rendererStyleMenu(table);
					},
					disableSelection: false,
					isCommand: true,
				},
			},
		},
		height,
		manualColumnResize: true,
		manualRowResize: true,
		mergeCells: [],
		language: 'zh-CN',
		renderer: customStylesRenderer,
		licenseKey: 'non-commercial-and-evaluation',
		// @ts-ignore
		formulas: { engine: HyperFormula, namedExpressions },
	});
	if (typeof cb !== 'function') { return table; }
	let timeout: any;
	const update = () => {
		clearTimeout(timeout);
		timeout = setTimeout(() => { cb(readValue(table)); }, 0);
	};
	table.addHook('afterMergeCells', update);
	table.addHook('afterUnmergeCells', update);
	table.addHook('afterColumnResize', update);
	table.addHook('afterRowResize', update);
	table.addHook('afterChange', update);
	table.addHook('afterSetCellMeta', update);
	table.addHook('afterCellFreeze' as any, update);
	return table;

}
