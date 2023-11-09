// Copyright (c) 2023, 天玑 Tianjy and contributors
// For license information, please see license.txt

import render from '../../../../public/js/lib/render.mjs';
import create from '../../../../public/js/lib/create.mjs';
import exportXLSX from '../../../../public/js/lib/exportXLSX.mjs';
import make_standard_filters, { getFilterValues } from '../../../../public/js/lib/makeFilters.mjs';
import toFieldArea from '../../../../public/js/utils/toFieldArea.mts';
import { InputMap } from '../../../../public/js/types.mts';

const doctype = 'Tianjy Statement Configuration';

function get_template(name: string) {
	return new Promise((resolve, reject) => {
		frappe.call({
			method: 'tianjy_statement.statement.get_template',
			type: 'GET',
			args: { doctype, name },
			callback: r => { resolve(r.message); },
		}).fail(reject);
	});
}

async function getData(name: string, ctx: Record<string, any>) {
	return new Promise<any>((resolve, reject) => {
		frappe.call({
			method: 'tianjy_statement.statement.get_data',
			args: { name, ctx },
			callback(r) { resolve(r?.message || {list: [], ctx}); },
		}).fail(reject);
	});
}
async function saveData(name: string, data: Record<string, any>) {
	return new Promise<any>((resolve, reject) => {
		frappe.call({
			method: 'tianjy_statement.statement.save_data',
			args: { name, data },
			callback(r) { resolve(r?.message); },
		}).fail(reject);
	});
}

async function createData(name: string, data: Record<string, any>) {
	return new Promise<any>((resolve, reject) => {
		frappe.call({
			method: 'tianjy_statement.statement.create',
			args: { name, data },
			callback(r) { resolve(r?.message); },
		}).fail(reject);
	});
}


function getNewName() {
	const [r, p, name] = location.pathname.split('/').filter(Boolean);
	if (r !== 'app' || p !== 'tianjy-statement' || !name) { return; }
	return decodeURIComponent(name);
}
function setPath(name: string) {
	const [r, p] = location.pathname.split('/').filter(Boolean);
	if (r !== 'app' || p !== 'tianjy-statement') { return; }
	history.replaceState({}, '', `/app/tianjy-statement/${encodeURIComponent(name)}`);
}
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
frappe.pages['tianjy-statement'].on_page_load = function (wrapper) {
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
	let k = 0;
	async function show(force?: boolean) {
		const newName = getNewName();
		if (!force && (!newName || name === newName)) { return; }
		if (newName) { name = newName; }
		if (!name) { return; }
		setPath(name);
		k++;
		let kk = k;
		loading.hidden = false;
		const doc: any = await get_template(name);
		if (kk !== k) { return; }
		title.textContent = doc.label || doc.name || label;

		const dt = doc.doc_type;
		if (!dt) {
			destroy();
			destroy = () => {};
			return;
		}
		const meta = frappe.get_meta(dt) || await new Promise<locals.DocType>(resolve => {
			frappe.model.with_doctype(dt, () => { resolve(frappe.get_meta(dt)!); }, true);
		});
		if (kk !== k) { return; }
		destroy();
		const template = JSON.parse(doc.template || 'null');
		if (!template) {
			destroy = () => {};
			return;
		}

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
		const quickFilters: {field: string;required?: boolean;required_creating?: boolean}[] = doc.quick_filters || [];
		const docname = doc.name;
		const editor = create(body, {height: '100%'});
		const tipArea = document.createElement('div');
		let inputMap: (InputMap | undefined)[][] | undefined;
		let globalData: Record<string, any> = {};
		let dataList = [];
		let filterValues = {};
		let createDoc = () => {};
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
			const d = render(template, dataArea, globalData, dataList, fieldArea, transposition, 0, Boolean(inputMap));
			({inputMap} = d);
			switchCreateButtonHidden();
			editor.inputMode = Boolean(inputMap);
			if (inputMap) {
				const map = inputMap;
				const {styles, data} = d;
				// TODO: 更新类型
				if (styles) {
					d.styles = styles.map((line, row) => line.map((style, col) => ({
						...style,
						readOnly: map[row]?.[col] ? undefined : 1,
					})));
				} else {
					d.styles = data.map((line, row) => line.map((_, col) => ({
						readOnly: map[row]?.[col] ? undefined : 1,
					})));
				}
			}
			editor.value = d;
		};
		let destroyed = false;
		let saving = false;
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
			const {list, ctx, method} = await getData(docname, data);
			if (destroyed || v !== k2) { return; }
			loading.hidden = true;
			globalData = {ctx, method};
			dataList = list;
			renderData();
		};
		const fields_dict = make_standard_filters(meta, filterDiv, quickFilters, data => {
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
			const r = {};
			for (const [row, line] of inputMap.entries()) {
				if (!line) { continue; }
				for (const [col, item] of line.entries()) {
					if (!item) { continue; }
					const newValue = data[row]?.[col] ?? null;
					if (typeof newValue === 'object') { continue; }
					const oldValue = item.value ?? null;
					if (newValue === oldValue) { continue; }
					const newText = newValue === null ? '' : String(newValue);
					const oldText = oldValue === null ? '' : String(oldValue);
					if (newText === oldText) { continue; }
					const {name, field, subname, subfield} = item;
					if (!(name in r)) {
						r[name] = {};
					}
					const doc = r[name];
					if (!subfield || !subname) {
						doc[field] = newValue;
						continue;
					}
					if (!(field in doc && typeof doc[field] === 'object')) {
						doc[field] = {};
					}
					const sub = doc[field];

					if (!(subname in sub)) {
						sub[subname] = {};
					}
					sub[subname][subfield] = newValue;
				}
			}
			if (!Object.keys(r).length) { return; }
			try {
				saving = true;
				loading.hidden = false;
				await saveData(docname, r);
				if (destroyed) { return; }
			} finally {
				loading.hidden = true;
				saving = false;
			}
			update(getFilterValues(fields_dict));
		};
		const exportButton = toolbar.appendChild(createButton('Export', () => exportXLSX(editor.readValue(true))));
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
		toolbar.appendChild(createButton('Refresh', () => update(getFilterValues(fields_dict), true)));
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

};
