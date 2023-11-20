// Copyright (c) 2023, 天玑 Tianjy and contributors
// For license information, please see license.txt

import render from '../lib/render.mjs';
import create from '../lib/create.mjs';
import exportXLSX from '../lib/exportXLSX.mjs';
import make_standard_filters, { getFilterValues } from '../lib/makeFilters.mjs';
import toFieldArea from '../utils/toFieldArea.mts';
import { InputLine } from '../types.mts';

import { get_template } from './get_template';
import { getData } from './getData';
import { saveData } from './saveData';
import { createData } from './createData';
import { getNewName } from './getNewName';
import { setPath } from './setPath';
import getSaveData from './getSaveData';
import getType from './getType';


function createButton(title: string, click: () => void) {
	const button = document.createElement('button');
	button.className = 'btn btn-default btn-sm';
	button.appendChild(document.createTextNode(__(title)));
	button.style.marginInlineEnd = '8px';
	button.style.marginBlockEnd = 'auto';
	button.addEventListener('click', click);
	return button;
}


const noop = () => {};

export default function load(wrapper) {
	// @ts-ignore
	const label= __('Tianjy Statement');

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


	wrapper.style.display = 'flex';
	wrapper.style.flexDirection = 'column';
	wrapper.style.height = 'calc(100vh - 60px)';
	const main: HTMLElement = wrapper.appendChild(document.createElement('div'));
	main.style.background = '#FFF';
	main.style.flex = '1';
	main.style.display = 'flex';
	main.style.flexDirection = 'column';
	main.style.position = 'relative';
	const loading = main.appendChild(document.createElement('tianjy-loading'));


	let destroy = noop;
	let name = '';
	async function show(force?: boolean) {
		const newName = getNewName();
		if (!force && (!newName || name === newName)) { return; }
		if (newName) { name = newName; }
		if (!name) { return; }
		setPath(name);
		let destroyed = false;
		let saving = false;
		destroy();
		destroy = () => { destroyed = true; };
		loading.hidden = false;
		const doc: any = await get_template(name);
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
		const creButton = toolbar.appendChild(createButton('Create', () => createDoc()));
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
			({inputMap} = d);
			switchCreateButtonHidden();
			editor.inputMode = Boolean(inputMap);
			if (!inputMap) {
				editor.value = d;
				return;
			}
			const map = inputMap;
			const {styles, data} = d;
			if (styles) {
				// @ts-ignore
				d.styles = styles.map((line, row) => line.map((style, col) => {
					const [r, c] = transposition ? [col, row] : [row, col];
					const line = map[r];
					const cell = line?.cells[c];
					const type = getType(dataFields, line, cell);
					if (!type) {
						if (cell) { line.cells[c] = null; }
						return { ...style, readOnly: 1 };
					}
					if (type === true) { return { ...style, readOnly: undefined }; }
					return { ...style, type, readOnly: undefined };
				}));
			} else {
				// @ts-ignore
				d.styles = data.map((line, row) => line.map((_, col) => {
					const [r, c] = transposition ? [col, row] : [row, col];
					const line = map[r];
					const cell = line?.cells[c];
					const type = getType(dataFields, line, cell);
					if (!type) {
						if (cell) { line.cells[c] = null; }
						return { readOnly: 1 };
					}
					if (type === true) { return { }; }
					return { type, readOnly: undefined };
				}));
			}
			editor.value = d;
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
					if (a !== b) { return; }
					value[k] = b;
					continue;
				}
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
		if (quickFilters.find(v => v.required)) {
			// TODO: 样式
			tipArea.style.position = 'ab';
			body.appendChild(tipArea);
		} else {
			update({});
		}
		const save = async () => {
			if (destroyed) { return; }
			if (!inputMap) { return; }
			if (saving) { return; }
			const data = editor.getData();
			const res = getSaveData(inputMap, data, transposition);
			if (!res) { return; }
			try {
				saving = true;
				loading.hidden = false;
				await saveData(docname, res);
				if (destroyed) { return; }
			} finally {
				loading.hidden = true;
				saving = false;
			}
			update(getFilterValues(fields_dict));
		};
		const exportButton = toolbar.appendChild(createButton(
			'Export',
			() => exportXLSX(editor.readValue(true)),
		));
		const saveButton = toolbar.appendChild(createButton('Save', save));
		const modeButton = toolbar.appendChild(createButton('录入', () => {
			if (inputMap) {
				inputMap = undefined;
				modeButton.innerText = '录入';
				saveButton.hidden = true;
				exportButton.hidden = false;
				creButton.hidden = true;
			} else {
				inputMap = [];
				modeButton.innerText = '预览';
				saveButton.hidden = false;
				exportButton.hidden = true;
				creButton.hidden = false;
			}
			renderData();
		}));
		creButton.hidden = true;
		saveButton.hidden = true;
		toolbar.appendChild(createButton(
			'Refresh',
			() => update(getFilterValues(fields_dict), true),
		));
		destroy = () => {
			if (destroyed) { return; }
			destroyed = true;
			editor.destroy();
			body.remove();
			toolbar.remove();
		};
	}
	$(wrapper).on('show', () => show(false));
	show(true);
}
