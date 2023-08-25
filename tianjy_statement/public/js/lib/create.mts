import Handsontable from 'handsontable';
import HyperFormula from 'hyperformula';

import type { Template, XLSXEditor } from '../types.mjs';

import customStylesRenderer from './customStylesRenderer.mjs';
import rendererStyleMenu from './rendererStyleMenu.mjs';
import readValue from './readValue.mjs';
import toSettings from './toSettings.mjs';

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


export default function create(
	el: HTMLElement,
	height: string,
	names: { name: string; expression: string | undefined; }[] = [],
	cb?: (template: Template) => void,
): XLSXEditor {
	el.style.overscrollBehavior = 'contain';
	el.style.isolation = 'isolate';
	let namedExpressions = names;

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
				formulasEnabled: {
					name() {
						const formulas = this.getPlugin('formulas');
						return formulas.enabled ? '显示公式' : '隐藏公式';
					},
					callback() {
						const formulas = this.getPlugin('formulas');
						const enabled = !formulas.enabled;
						if (enabled) {
							table.updateSettings({
								// @ts-ignore
								formulas: { engine: HyperFormula, namedExpressions },
							});
							formulas.enablePlugin();
						} else {
							formulas.disablePlugin();
						}
						this.render();
					},
				},

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
	if (typeof cb === 'function') {
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

	}
	let destroyed = false;
	return {
		destroy() {
			if (destroyed) { return; }
			destroyed = true;
			table.destroy();
		},
		get destroyed() { return destroyed; },
		get value() { return readValue(table); },
		set value(value) {
			if (destroyed) { return; }
			table.updateSettings(toSettings(value));
		},
		get formulasEnabled() { return table.getPlugin('formulas').enabled; },
		set formulasEnabled(v) {
			const enabled = Boolean(v);
			if (table.getPlugin('formulas').enabled === enabled) { return; }
			const formulas = table.getPlugin('formulas');
			if (enabled) {
				table.updateSettings({
					// @ts-ignore
					formulas: { engine: HyperFormula, namedExpressions },
				});
				formulas.enablePlugin();
			} else {
				formulas.disablePlugin();
			}
			table.render();
		},
		readValue(h) {
			if (!h || table.getPlugin('formulas').enabled) {
				return readValue(table, h);
			}
			const formulas = table.getPlugin('formulas');
			table.updateSettings({
				// @ts-ignore
				formulas: { engine: HyperFormula, namedExpressions },
			});
			formulas.enablePlugin();
			const value = readValue(table, h);
			formulas.disablePlugin();
			return value;
		},
		get namedExpressions() { return namedExpressions; },
		set namedExpressions(names) {
			namedExpressions = names;
			const formulas = table.getPlugin('formulas');
			if (!formulas.enabled) { return; }
			formulas.disablePlugin();
			table.updateSettings({
				// @ts-ignore
				formulas: { engine: HyperFormula, namedExpressions },
			});
			formulas.enablePlugin();
		},
	};

}
