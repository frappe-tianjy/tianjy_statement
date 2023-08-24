// Copyright (c) 2023, 天玑 Tianjy and contributors
// For license information, please see license.txt

import initShow from './initShow';
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
const noop = () => {};
frappe.pages['tianjy-statement'].on_page_load = function (wrapper) {
	const label= __('Tianjy Statement');

	const head = wrapper.appendChild(document.createElement('div'));
	head.style.padding = '8px 0';
	head.className = 'flex title-area';
	const h3 = head.appendChild(document.createElement('h3'));
	h3.title = label;
	h3.className = 'ellipsis title-text';
	h3.style.margin = '1';
	h3.appendChild(document.createTextNode(label));

	const toolbar = wrapper.appendChild(document.createElement('div'));
	toolbar.style.display = 'flex';
	toolbar.style.flexDirection = 'row';

	const buttonGroup = toolbar.appendChild(document.createElement('div'));
	buttonGroup.hidden = true;
	const refreshButton = buttonGroup.appendChild(document.createElement('button'));
	refreshButton.className = 'btn btn-default btn-sm';
	refreshButton.style.marginBottom = 'auto';
	refreshButton.appendChild(document.createTextNode(__('Refresh')));
	refreshButton.style.marginInlineEnd = '8px';
	const exportButton = buttonGroup.appendChild(document.createElement('button'));
	exportButton.className = 'btn btn-default btn-sm';
	exportButton.style.marginBottom = 'auto';
	exportButton.appendChild(document.createTextNode(__('Export')));


	wrapper.style.display = 'flex';
	wrapper.style.flexDirection = 'column';
	wrapper.style.height = 'calc(100vh - 60px)';


	let destroy = noop;
	let name = '';
	let k = 0;
	let f: frappe.ui.form.Control | undefined;
	async function update(newName?: string) {
		if (newName) { name = newName; }
		if (!name) { return; }
		if (f && f.get_value() !== newName) {
			f.set_value(newName);
		}
		const p = location.pathname.split('/').filter(Boolean);
		if (p[0] === 'app' && p[1] === 'tianjy-statement') {
			history.replaceState({}, '', `/app/tianjy-statement/${encodeURIComponent(name)}`);
		}
		k++;
		let kk = k;
		const doc: any = await get_template(name);
		if (kk !== k) { return; }
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

		const filterDiv = toolbar.appendChild(document.createElement('div'));
		filterDiv.style.flex = '1';
		toolbar.insertBefore(filterDiv, toolbar.firstChild);

		const body = wrapper.appendChild(document.createElement('div'));
		body.style.flex = '1';

		const [dest, exportXLSX] = initShow(body, filterDiv, meta, doc, template);
		buttonGroup.hidden = false;
		exportButton.addEventListener('click', exportXLSX);
		destroy = () => {
			dest();
			filterDiv.remove();
			body.remove();
			buttonGroup.hidden = true;
			exportButton.removeEventListener('click', exportXLSX);
		};
	}

	f = frappe.ui.form.make_control({
		df: {
			options: doctype,
			fieldtype: 'Link',
			label,
			onchange() {
				if (!f) { return; }
				const value = f.get_value();
				if (!value || name === value) { return; }
				update(value);
			},
			is_filter: 1,
			placeholder: label,
			condition: '=',
			input_class: 'input-xs',
		}, parent: $(head), only_input: true,
	});


	refreshButton.addEventListener('click', () => update());
	const p = location.pathname.split('/').filter(Boolean);
	if (p[0] === 'app' && p[1] === 'tianjy-statement') {
		const [,, name] = p;
		if (name) {
			update(decodeURIComponent(name));
		}
	}
	f.wrapper.title = label;
	f.wrapper.style.flex = '1';
	f.wrapper.style.marginInline = '8px';
	f.refresh();
};
