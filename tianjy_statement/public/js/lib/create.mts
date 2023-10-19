import Handsontable from 'handsontable';
import HyperFormula from 'hyperformula';

import type { Template, XLSXEditor } from '../types.mjs';

import customStylesRenderer, { getRenderer } from './customStylesRenderer.mjs';
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


function setType(
	table: Handsontable,
	range:{start:{row:number, col:number}, end:{row:number, col:number}}[],
	type: 'numeric' | 'text',
) {
	const prop: any = {
		type,
		className: '',
		numericFormat: type === 'numeric' ? { pattern: '0,0.00' } : {},
		renderer: getRenderer(type),
		editor: type,
		dataType: type,
	};
	if (type !== 'numeric') {
		prop.valid = undefined;
		prop.validator = undefined;
	}

	for (const item of range) {
		const startRow = item.start.row;
		const endRow = item.end.row;
		const startCol = item.start.col;
		const endCol = item.end.col;
		for (let row =startRow; row<=endRow; row++ ){
			for (let col =startCol; col<=endCol; col++){
				table.setCellMetaObject(row, col, prop);
			}
		}
	}
	table.render();
}


export default function create(el: HTMLElement, {
	formula: formulaEngine,
	name,
	height,
	names = [],
	readOnly,
	inited,
}: {
	height: string;
	formula?: HyperFormula;
	name?: string;
	names?: { name: string; expression: string | undefined; }[];
	readOnly?: boolean;
	inited?: () => void;
}, cb?: (editor: XLSXEditor) => void): XLSXEditor {
	el.style.overscrollBehavior = 'contain';
	el.style.isolation = 'isolate';
	let namedExpressions = names;
	let sheetName = name || '';
	let engine = formulaEngine || HyperFormula.buildEmpty({
		licenseKey: 'internal-use-in-handsontable',
		localeLang: 'zh-cn',
	});

	const table: Handsontable = new Handsontable(el, {
		startRows: 8,
		startCols: 6,
		rowHeaders: true,
		colHeaders: true,
		contextMenu: {
			items: readOnly ? {
				row_above: {},
				row_below: {},
				hr0: '---------' as any,
				col_left: {},
				col_right: {},
			} : {
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
				sp3: '---------' as any,
				make_read_only: {},
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
				resumeEvaluation: { name:'重新计算', callback() {
					const formulas = this.getPlugin('formulas');
					if (formulas.enabled) {
						formulas.disablePlugin();
					}
					const fs = this.getSettings().formulas;
					this.updateSettings({ formulas: fs && {...fs} });
					formulas.enablePlugin();
					// this.render();
				}},
				formulasEnabled: {
					name() {
						const formulas = this.getPlugin('formulas');
						return formulas.enabled ? '显示公式' : '隐藏公式';
					},
					callback() {
						const formulas = this.getPlugin('formulas');
						const enabled = !formulas.enabled;
						if (enabled) {
							const fs = this.getSettings().formulas;
							this.updateSettings({ formulas: fs && {...fs} });
							formulas.enablePlugin();
						} else {
							formulas.disablePlugin();
						}
						this.render();
					},
				},
				'type':{ name:'类型', submenu:{ items:[ {
					key:'type:numeric', name:'数字',
					callback(type, range){ setType(this, range, 'numeric'); },
				}, {
					key:'type:text', name:'文本',
					callback(type, range){ setType(this, range, 'text'); },
				}]}},

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
		readOnly,
		height,
		copyPaste: true,
		trimWhitespace: false,
		manualColumnResize: true,
		manualRowResize: true,
		mergeCells: [],
		customBorders: [],
		language: 'zh-CN',
		renderer: customStylesRenderer,
		licenseKey: 'non-commercial-and-evaluation',
		// @ts-ignore
		formulas: { engine, sheetName, namedExpressions },
		afterInit: typeof inited === 'function' ? inited : undefined,
	});
	let destroyed = false;

	function initFormulas() {
		const fs = table.getSettings().formulas;
		table.updateSettings({ formulas: fs && {...fs} });
	}
	function updateFormulas() {
		const formulas = table.getPlugin('formulas');
		if (!formulas.enabled) { return; }
		formulas.disablePlugin();
		initFormulas();
		formulas.enablePlugin();

	}
	const editor: XLSXEditor = {
		destroy() {
			if (destroyed) { return; }
			destroyed = true;
			table.destroy();
			const sheetId = engine.getSheetId(sheetName);
			if (typeof sheetId !== 'number') { return; }
			engine.removeSheet(sheetId);

		},
		get destroyed() { return destroyed; },
		get value() { return readValue(table); },
		set value(value) {
			if (destroyed) { return; }
			const settings = toSettings(value);
			const sheetId = engine.getSheetId(sheetName);
			if (typeof sheetId === 'number') {
				engine.removeSheet(sheetId);
			}
			table.updateSettings(settings);
		},
		get formulasEnabled() { return table.getPlugin('formulas').enabled; },
		set formulasEnabled(v) {
			const enabled = Boolean(v);
			const formulas = table.getPlugin('formulas');
			if (formulas.enabled === enabled) { return; }
			if (enabled) {
				initFormulas();
				formulas.enablePlugin();
			} else {
				formulas.disablePlugin();
			}
			table.render();
		},
		readValue(h) {
			if (!h) { return readValue(table); }
			const formulas = table.getPlugin('formulas');
			if (formulas.enabled) { return readValue(table, true); }
			initFormulas();
			formulas.enablePlugin();
			const value = readValue(table, true);
			formulas.disablePlugin();
			return value;
		},
		get name() { return sheetName; },
		set name(newName) {
			const name = newName || '';
			if (name === sheetName) { return; }
			const sheetId = engine.getSheetId(sheetName);
			if (typeof sheetId !== 'number') { return; }
			sheetName = name;
			engine.renameSheet(sheetId, sheetName);
		},
		get namedExpressions() { return namedExpressions; },
		set namedExpressions(names) {
			namedExpressions = names;
			updateFormulas();
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
