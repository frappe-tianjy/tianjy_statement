// Copyright (c) 2023, 天玑 Tianjy and contributors
// For license information, please see license.txt

import render from '../lib/render.mjs';
import create from '../lib/create.mjs';
import exportXLSX from '../lib/exportXLSX.mjs';
import make_standard_filters, { getFilterValues } from '../lib/makeFilters.mjs';
import toFieldArea from '../utils/toFieldArea.mts';
import { InputLine, TemplateStyle } from '../types.mts';

import { get_template } from './get_template';
import { getData } from './getData';
import { saveData } from './saveData';
import { createData } from './createData';
import { getNewName } from './getNewName';
import { setPath } from './setPath';
import getSaveData, { setModified } from './getSaveData';
import getType from './getType';


function createButton(title: string, click: () => void, icon?: string) {
	const button = document.createElement('button');
	button.className = 'btn btn-default btn-sm';
	if (icon) {
		button.innerHTML = frappe.utils.icon(icon);
		button.title = __(title);
		try {
			$(button).tooltip({ delay: { show: 600, hide: 100 }, trigger: 'hover' });
		} catch {}

	} else {
		button.appendChild(document.createTextNode(__(title)));
	}
	button.style.marginInlineEnd = '8px';
	button.style.marginBlockEnd = 'auto';
	button.addEventListener('click', click);
	return button;
}


const noop = () => {};
// @ts-ignore
const label= __('Tianjy Statement');

export default function load(wrapper) {


	wrapper.style.display = 'flex';
	wrapper.style.flexDirection = 'column';
	wrapper.style.height = 'calc(100vh - 60px)';


	let destroy = noop;
	let name = '';
	async function show(force?: boolean) {
		const newName = getNewName();
		if (!force && (!newName || name === newName)) { return; }
		if (newName) { name = newName; }
		if (!name) { return; }
		setPath(name);
		const head = wrapper.appendChild(document.createElement('div'));
		head.style.padding = '8px';
		head.style.height = '75px';
		head.style.display = 'flex';
		head.style.alignItems = 'center';
		head.className = 'title-area';
		const h3 = head.appendChild(document.createElement('h3'));
		h3.title = label;
		h3.className = 'ellipsis title-text';
		h3.style.margin = '0';
		const title = h3.appendChild(document.createTextNode(label));
		const unsavedIndicator = head.appendChild(document.createElement('span'));
		unsavedIndicator.hidden = true;
		unsavedIndicator.className='indicator-pill whitespace-nowrap orange';
		unsavedIndicator.appendChild(document.createTextNode(__('Not Saved')));

		const main: HTMLElement = wrapper.appendChild(document.createElement('div'));
		main.style.background = '#FFF';
		main.style.flex = '1';
		main.style.display = 'flex';
		main.style.flexDirection = 'column';
		main.style.position = 'relative';
		const loading = main.appendChild(document.createElement('tianjy-loading'));
		let destroyed = false;
		let saving = false;
		destroy();
		destroy = () => {
			destroyed = true;
			head.remove();
			main.remove();
		};
		loading.hidden = false;
		const doc: any = await get_template(name);
		const {mode} = doc;
		if (destroyed) { return; }
		title.textContent = doc.label || doc.name || label;

		const dt = doc.doc_type;
		if (!dt) { return; }
		// @ts-ignore
		const meta = frappe.get_meta(dt) || await new Promise<locals.DocType>(resolve => {
			// @ts-ignore
			frappe.model.with_doctype(dt, () => { resolve(frappe.get_meta(dt)!); }, true);
		});
		if (destroyed) { return; }
		const template = JSON.parse(doc.template || 'null');
		if (!template) { return; }

		const toolbar = main.insertBefore(document.createElement('div'), loading);
		toolbar.style.display = 'flex';
		toolbar.style.flexDirection = 'row';
		toolbar.style.background = '#FFF';
		toolbar.style.padding = '8px';
		const filterDiv = toolbar.appendChild(document.createElement('div'));
		const editToolbar = toolbar.appendChild(document.createElement('div'));
		const viewToolbar = toolbar.appendChild(document.createElement('div'));
		filterDiv.style.flex = '1';
		const body = main.insertBefore(document.createElement('div'), loading);
		body.style.background = '#FFF';
		body.style.flex = '1';

		const dataArea: [number, number] = [doc.start_row, doc.end_row];
		const fieldArea = toFieldArea(doc.areas);
		const {transposition} = doc;
		const quickFilters: {
			field: string;required?: boolean;required_creating?: boolean
		}[] = doc.quick_filters || [];
		const docname = doc.name;
		const editor = create(body, {height: '100%'});
		const tipArea = document.createElement('div');
		let inputMap: (InputLine | undefined)[] | undefined;
		let globalData: Record<string, any> = {};
		let dataFields: Record<string, any> = {};
		let dataList = [];
		let filterValues = {};
		let createDoc = noop;
		const creButton = createButton('Create', () => createDoc(), 'add');
		function switchCreateButtonHidden() {
			if (dataList.length) {
				creButton.disabled = true;
				return;
			}
			for (const {required_creating, field} of quickFilters) {
				if (!required_creating) { continue; }
				if (field in filterValues) { continue; }
				const v = filterValues[field];
				if (Array.isArray(v) && v[0] !== v[1]) { continue; }
				creButton.disabled = true;
				return;
			}
			for (const [k, v] of Object.entries(filterValues)) {
				if (Array.isArray(v)) {
					const [a, b] = v;
					if (a === b) { continue; }
					creButton.disabled = true;
					return;
				}
			}
			creButton.disabled = false;
		}
		let modified: Record<string, any> = {};
		const renderData = () => {
			const d = render(
				template,
				dataArea,
				globalData,
				dataList,
				fieldArea,
				transposition,
				0,
				Boolean(inputMap),
			);
			modified = {};
			unsavedIndicator.hidden = true;

			({inputMap} = d);
			switchCreateButtonHidden();
			editor.inputMode = Boolean(inputMap);
			if (!inputMap) {
				editor.setValue(d, true);
				editor.onChange = noop;
				editor.onPaste = noop;
				return;
			}
			const map = inputMap;
			const {styles, data} = d;
			function getStyle(row: number, col: number, style?: TemplateStyle): TemplateStyle {
				const [r, c] = transposition ? [col, row] : [row, col];
				const line = map[r];
				const cell = line?.cells[c];
				const type = getType(dataFields, line, cell);
				if (!type) {
					if (cell) { line.cells[c] = null; }
					return { ...style, readOnly: 1 };
				}
				if (type === true) { return { ...style, readOnly: undefined }; }
				// @ts-ignore
				return { ...style, type, readOnly: undefined };

			}
			d.styles = styles
				? styles.map((l, r) => l.map((s, c) => getStyle(r, c, s)))
				: data.map((l, r) => l.map((_, c) => getStyle(r, c)));
			editor.setValue(d, false);
			editor.onChange = list => {
				let unsaved = false;
				for (const [row, col, , data] of list) {
					const [r, c] = transposition ? [col, row] : [row, col];
					const line = map[r];
					if (!line) { continue; }
					const cell = line.cells[c];
					if (!cell) { continue; }
					if (setModified(modified, data, line, cell)) {
						unsaved = true;
					}

				}
				if (unsaved) {
					unsavedIndicator.hidden = false;
				}
			};
			editor.onPaste = async (_, coords) => {
				if (saving) { return; }
				saving = true;
				loading.hidden = false;
				const data = editor.getData();
				let unsaved = false;
				try {
					for (const {startCol, startRow, endCol, endRow} of coords) {
						for (let row = startRow; row <= endRow; row++) {
							for (let col = startCol; col <= endCol; col++) {
								const [r, c] = transposition ? [col, row] : [row, col];
								const line = map[r];
								if (!line) { continue; }
								const cell = line.cells[c];
								if (!cell) { continue; }
								const {update} = cell;
								if (!update) { continue; }
								const value = data?.[row]?.[col];
								const s = await update(value);
								if (s === null) { continue; }
								// TODO: 将s存入上下文
								if (setModified(modified, s, line, cell)) {
									unsaved = true;
								}
							}
						}
					}
				} finally {
					loading.hidden = true;
					saving = false;
					if (unsaved) {
						unsavedIndicator.hidden = false;
					}

				}
			};
		};
		let k2 = 0;
		const update = async (data: any, isRefresh = false) => {
			if (destroyed || saving) { return; }
			for (const {required, field} of quickFilters) {
				if (!required) { continue; }
				if (field in data) { continue; }
				if (isRefresh) {
					// TODO: 警告存在必填项未填写
				}
				return;
			}
			k2++;
			const v = k2;
			loading.hidden = false;
			tipArea.remove();
			const {list, ctx, method, fields} = await getData(docname, data);
			if (destroyed || v !== k2) { return; }
			loading.hidden = true;
			globalData = {ctx, method};
			dataFields = fields;
			dataList = list;
			renderData();
		};
		const fields_dict = make_standard_filters(meta.fields, filterDiv, quickFilters, data => {
			filterValues = data;
			update(data);
		});
		createDoc = async () => {
			if (destroyed || saving) { return; }
			const value = {};
			for (const [k, v] of Object.entries(filterValues)) {
				if (Array.isArray(v)) {
					const [a, b] = v;
					if (a !== b) { continue; }
					value[k] = b;
					continue;
				}
				value[k] = v;
			}
			try {
				saving = true;
				loading.hidden = false;
				await createData(docname, value);
				if (destroyed) { return; }
			} finally {
				loading.hidden = true;
				saving = false;
			}
			update(getFilterValues(fields_dict));

		};
		const save = async () => {
			if (destroyed) { return; }
			if (!inputMap) { return; }
			if (saving) { return; }
			if (unsavedIndicator.hidden) {
				frappe.show_alert({message: __('No changes in document'), indicator: 'orange'});
				return;
			}
			try {
				saving = true;
				loading.hidden = false;
				await saveData(docname, modified);
				if (destroyed) { return; }
				modified = {};
				unsavedIndicator.hidden = true;
				frappe.show_alert({message: __('Saved'), indicator: 'green'});
			} finally {
				loading.hidden = true;
				saving = false;
			}
			update(getFilterValues(fields_dict));
		};
		editToolbar.hidden = true;
		const toEdit = () => {
			inputMap = [];
			editToolbar.hidden = false;
			viewToolbar.hidden = true;
			renderData();
		};
		const toView = () => {
			inputMap = undefined;
			editToolbar.hidden = true;
			viewToolbar.hidden = false;
			renderData();
		};
		const refresh = () => update(getFilterValues(fields_dict), true);
		const export2xlsx = () => exportXLSX(editor.readValue(true));
		editToolbar.appendChild(creButton);
		if (mode !== 'Input Only') {
			editToolbar.appendChild(createButton('预览', toView, 'view'));
		}
		editToolbar.appendChild(createButton('Refresh', refresh, 'refresh'));
		editToolbar.appendChild(createButton('Save', save)).classList.add('btn-primary');

		if (mode !== 'View Only') {
			viewToolbar.appendChild(createButton('录入', toEdit, 'edit'));
		}
		viewToolbar.appendChild(createButton('Export', export2xlsx, 'upload'));
		viewToolbar.appendChild(createButton('Refresh', refresh, 'refresh'));
		if (mode === 'Input Only' || mode === 'Input Default') {
			inputMap = [];
			editToolbar.hidden = false;
			viewToolbar.hidden = true;
		}
		if (quickFilters.find(v => v.required)) {
			// TODO: 样式
			// tipArea.style.position = 'ab';
			// body.appendChild(tipArea);
			loading.hidden = true;
			renderData();
		} else {
			update({});
		}
		destroy = () => {
			if (destroyed) { return; }
			destroyed = true;
			editor.destroy();
			head.remove();
			main.remove();
		};
	}
	$(wrapper).on('show', () => show(false));
	show(true);
}
