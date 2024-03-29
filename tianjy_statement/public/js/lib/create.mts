import Handsontable from 'handsontable';
import HyperFormula from 'hyperformula';
import * as XLSX from 'xlsx-js-style';
import type { RangeType } from 'handsontable/common';

import type { Template, XLSXEditor } from '../types.mjs';

import customStylesRenderer, { getRenderer } from './customStylesRenderer.mjs';
import rendererStyleMenu from './rendererStyleMenu.mjs';
import readValue from './readValue.mjs';
import toSettings from './toSettings.mjs';
import createXLSXSheet from './createXLSXSheet.mts';

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

const noop = () => {};

export default function create(el: HTMLElement, {
	formula: formulaEngine,
	name,
	height,
	names,
	readOnly: ro,
	inited,
	inputMode: isInputMode,
	getSheets,
}: {
	height: string;
	formula?: HyperFormula;
	name?: string;
	names?: Record<string, string>;
	readOnly?: boolean;
	inputMode?: boolean,
	inited?: () => void;
	getSheets?: () => Record<string, XLSXEditor> | null | undefined,
}, cb?: (editor: XLSXEditor) => void): XLSXEditor {
	el.style.overscrollBehavior = 'contain';
	el.style.isolation = 'isolate';
	let namedExpressions = names || {};
	let sheetName = name || '';
	let engine = formulaEngine || HyperFormula.buildEmpty({
		licenseKey: 'internal-use-in-handsontable',
		localeLang: 'zh-cn',
	});
	for (const [name, expression] of Object.entries(namedExpressions)) {
		try {
			engine.addNamedExpression(name, expression);
		} catch (e) {
			console.error(e, name, expression);
		}
	}
	let inputMode = Boolean(isInputMode);


	let readOnly = Boolean(ro);
	const disabled = () => readOnly || inputMode;

	let onChange: (changed: [number, number, any, any][]) => void = noop;
	let onPaste: (data: any[][], coords: RangeType[]) => void = noop;

	const table: Handsontable = new Handsontable(el, {
		startRows: 8,
		startCols: 6,
		rowHeaders: true,
		colHeaders: true,
		contextMenu: {
			items: {
				row_above: {disabled},
				row_below: {disabled},
				hr0: '---------' as any,
				col_left: {disabled},
				col_right: {disabled},
				hr1: '---------' as any,
				remove_row: {disabled},
				remove_col: {disabled},
				hr2: '---------' as any,
				undo: {},
				redo: {},
				sp3: '---------' as any,
				make_read_only: {disabled},
				hr3: '---------' as any,
				alignment: {disabled},
				border: { disabled, name: '边框', submenu: { items: [
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
						return disabled() || !getStartRange(this);
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
				mergeCells: {disabled},
				resumeEvaluation: { disabled, name:'重新计算', callback() {
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
					disabled,
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
				'type':{ disabled, name:'类型', submenu:{ items:[ {
					key:'type:numeric', name:'数字',
					callback(type, range){ setType(this, range, 'numeric'); },
				}, {
					key:'type:text', name:'文本',
					callback(type, range){ setType(this, range, 'text'); },
				}]}},
				hr7: '---------' as any,
				export: {
					disabled: () => inputMode, name: '导出',
					// eslint-disable-next-line @typescript-eslint/no-use-before-define
					callback() { exportXLSX(true); },
				},
				hr8: '---------' as any,
				style: {
					disabled,
					renderer() {
						return rendererStyleMenu(table, disabled());
					},
					disableSelection: false,
					isCommand: true,
				},
			},
		},
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
		formulas: { engine, sheetName },
		afterInit: typeof inited === 'function' ? inited : undefined,
		beforePaste: (data, coords) => {
			if (readOnly) {
				data.length = 0;
				coords.length = 0;
				return;
			}
			for (const d of data) {
				for (let i = 0; i < d.length; i++) {
					const value = d[i];
					if (!value) { continue; }
					if (typeof value !== 'string') { continue; }
					const n = Number(value.replace(/,/g, ''));
					if (Number.isNaN(n)) { continue; }
					d[i] = n;
				}
			}
		},
		afterPaste(data, coords) {
			onPaste(data, coords);
		},
		afterChange(changes, source) {
			if (!changes?.length) { return; }
			onChange(changes as any);
		},
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
	function readValueWithData() {
		const formulas = table.getPlugin('formulas');
		if (formulas.enabled) { return readValue(table, true); }
		initFormulas();
		formulas.enablePlugin();
		const value = readValue(table, true);
		formulas.disablePlugin();
		return value;
	}
	function exportXLSX(all?: boolean | Record<string, XLSXEditor> | string, name?: string) {
		const sheets = typeof all === 'object' && all || all === true && getSheets?.();
		const list = sheets && typeof sheets === 'object' && Object.entries(sheets) || [];
		const wb = XLSX.utils.book_new();
		if (list.length) {
			for (const [name, editor] of list) {
				const ws = createXLSXSheet(editor.readValue(true));
				XLSX.utils.book_append_sheet(wb, ws, name);
			}
		} else {
			const ws = createXLSXSheet(readValueWithData());
			XLSX.utils.book_append_sheet(wb, ws, 'Data');
		}
		const fileName = [all, name].find(v => v && typeof v === 'string');
		XLSX.writeFile(wb, `${fileName || 'Data'}.xlsx`);
	}
	function setValue(value: Template) {
		const old = onChange;
		onChange = noop;
		const settings = toSettings(value, readOnly);
		const sheetId = engine.getSheetId(sheetName);
		if (typeof sheetId === 'number') {
			engine.removeSheet(sheetId);
		}
		// @ts-ignore
		table.updateSettings(settings);
		onChange = old;
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
		exportXLSX,
		get readOnly() { return readOnly; },
		set readOnly(ro) {
			if (destroyed) { return; }
			if (readOnly === Boolean(ro)) { return; }
			readOnly = !readOnly;
			setValue(readValue(table));
		},
		get destroyed() { return destroyed; },
		get value() { return readValue(table); },
		set value(value) {
			if (destroyed) { return; }
			setValue(value);
		},
		setValue(value, ro) {
			if (destroyed) { return; }
			if (typeof ro === 'boolean') { readOnly = ro; }
			setValue(value);
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
			return readValueWithData();
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
		get onChange() { return onChange; },
		set onChange(o) { onChange = o; },
		get onPaste() { return onPaste; },
		set onPaste(o) { onPaste = o; },

		getData() { return table.getData().map((v: any) => [...v as any]); },
		get inputMode() { return inputMode; },
		set inputMode(v) { inputMode = Boolean(v); },
		get namedExpressions() { return namedExpressions; },
		set namedExpressions(names) {
			for (const name of Object.keys(namedExpressions)) {
				try {
					engine.removeNamedExpression(name);
				} catch (e) {
					console.error(e, name);
				}
			}
			namedExpressions = names;
			for (const [name, expression] of Object.entries(namedExpressions)) {
				try {
					engine.addNamedExpression(name, expression);
				} catch (e) {
					console.error(e, name, expression);
				}
			}
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
