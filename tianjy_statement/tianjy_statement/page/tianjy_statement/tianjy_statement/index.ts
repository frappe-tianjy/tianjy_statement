// Copyright (c) 2023, 天玑 Tianjy and contributors
// For license information, please see license.txt

import render from '../../../../public/js/lib/render.mjs';
import create from '../../../../public/js/lib/create.mjs';
import exportXLSX from '../../../../public/js/lib/exportXLSX.mjs';
import make_standard_filters, { getFilterValues } from '../../../../public/js/lib/makeFilters.mjs';

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

		const toolbar = wrapper.appendChild(document.createElement('div'));
		toolbar.style.display = 'flex';
		toolbar.style.flexDirection = 'row';
		toolbar.style.background = '#FFF';
		toolbar.style.padding = '8px';
		const filterDiv = toolbar.appendChild(document.createElement('div'));
		filterDiv.style.flex = '1';
		const refreshButton = toolbar.appendChild(document.createElement('button'));
		refreshButton.className = 'btn btn-default btn-sm';
		refreshButton.appendChild(document.createTextNode(__('Refresh')));
		refreshButton.style.marginInlineEnd = '8px';
		const exportButton = toolbar.appendChild(document.createElement('button'));
		exportButton.className = 'btn btn-default btn-sm';
		exportButton.style.marginInlineEnd = '8px';
		exportButton.appendChild(document.createTextNode(__('Export')));

		const body = wrapper.appendChild(document.createElement('div'));
		body.style.background = '#FFF';
		body.style.flex = '1';

		const dataArea: [number, number] = [doc.start_row, doc.end_row];
		const ctx = doc.quick_filters || [];
		const docname = doc.name;
		const editor = create(body, '100%');
		let destroyed = false;
		let k2 = 0;
		const update = async (data: any) => {
			if (destroyed) { return; }
			k2++;
			const v = k2;
			const {list, ctx} = await getData(docname, data);
			if (destroyed || v !== k2) { return; }
			editor.value = render(template, dataArea, ctx, list);
		};
		const fields_dict = make_standard_filters(meta, filterDiv, ctx, update);
		update({});
		exportButton.addEventListener('click', () => exportXLSX(editor.readValue(true)));
		refreshButton.addEventListener('click', () => update(getFilterValues(fields_dict)));
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
