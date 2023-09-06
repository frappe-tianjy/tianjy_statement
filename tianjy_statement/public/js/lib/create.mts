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


function setBorder(
	handsontable: Handsontable,
	selection: Handsontable.plugins.ContextMenu.Selection[],
	type: 'all' | 'top' | 'right' | 'bottom' | 'left' | 'inner' | 'clear',
) {
	const customBorders = handsontable.getPlugin('customBorders');
	switch (type) {
		case 'all':
			customBorders.setBorders(selection.map(v=> [
				v.start.row,
				v.start.col,
				v.end.row,
				v.end.col,
			] as [number, number, number, number]), {
				left: {color: '#000000', width: 1},
				right: {color: '#000000', width: 1},
				top: {color: '#000000', width: 1},
				bottom: {color: '#000000', width: 1},
			});
			break;
		case 'clear':
			customBorders.clearBorders(selection.map(v=> [
				v.start.row,
				v.start.col,
				v.end.row,
				v.end.col,
			] as [number, number, number, number]));
			break;
		case 'top':
			customBorders.setBorders(selection.map(v=> [
				v.start.row,
				v.start.col,
				v.start.row,
				v.end.col,
			] as [number, number, number, number]), {
				top: {color: '#000000', width: 1},
			});
			break;
		case 'right':
			customBorders.setBorders(selection.map(v=> [
				v.start.row,
				v.end.col,
				v.end.row,
				v.end.col,
			] as [number, number, number, number]), {
				right: {color: '#000000', width: 1},
			});
			break;
		case 'bottom':
			customBorders.setBorders(selection.map(v=> [
				v.end.row,
				v.start.col,
				v.end.row,
				v.end.col,
			] as [number, number, number, number]), {
				bottom: {color: '#000000', width: 1},
			});
			break;
		case 'left':
			customBorders.setBorders(selection.map(v=> [
				v.start.row,
				v.start.col,
				v.end.row,
				v.start.col,
			] as [number, number, number, number]), {
				left: {color: '#000000', width: 1},
			});
			break;
		case 'inner':
			// TODO
			break;

	}
}

export default function create(
	el: HTMLElement,
	height: string,
	names: { name: string; expression: string | undefined; }[] = [],
	cb?: (editor: XLSXEditor) => void,
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
				border: { name: '边框', submenu: { items: [
					{ key: 'border:all', name: '全部', callback(key, selection, clickEvent) {
						setBorder(this, selection, 'all');
					}},
					// { key: 'border:inner', name: '内部', callback(key, selection, clickEvent) {
					// 	setBorder(this, selection, 'inner');
					// }},
					{ key: 'border:outer', name: '外框', callback(key, selection, clickEvent) {
						setBorder(this, selection, 'top');
						setBorder(this, selection, 'right');
						setBorder(this, selection, 'bottom');
						setBorder(this, selection, 'left');
					}},
					{ key: 'border:top', name: '上', callback(key, selection, clickEvent) {
						setBorder(this, selection, 'top');
					}},
					{ key: 'border:right', name: '右', callback(key, selection, clickEvent) {
						setBorder(this, selection, 'right');
					}},
					{ key: 'border:bottom', name: '下', callback(key, selection, clickEvent) {
						setBorder(this, selection, 'bottom');
					}},
					{ key: 'border:left', name: '左', callback(key, selection, clickEvent) {
						setBorder(this, selection, 'left');
					}},
					{ key: 'border:clear', name: '清除', callback(key, selection, clickEvent) {
						setBorder(this, selection, 'clear');
					}},
				] } },
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
		customBorders: [],
		language: 'zh-CN',
		renderer: customStylesRenderer,
		licenseKey: 'non-commercial-and-evaluation',
		// @ts-ignore
		formulas: { engine: HyperFormula, namedExpressions },
	});
	let destroyed = false;
	const editor: XLSXEditor = {
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

	if (typeof cb === 'function') {
		let timeout: any;
		table.addHook('afterRender', () => {
			clearTimeout(timeout);
			timeout = setTimeout(() => { cb(editor); }, 1);
		});
	}

	return editor;

}
