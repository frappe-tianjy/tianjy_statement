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
	h3.appendChild(document.createTextNode(label));

	wrapper.style.display = 'flex';
	wrapper.style.flexDirection = 'column';
	wrapper.style.height = 'calc(100vh - 60px)';
	let destroy =noop;
	let lastName = '';
	let k = 0;
	let f: frappe.ui.form.Control | undefined;
	async function update(v?: string) {
		if (!v || lastName === v) { return; }
		lastName = v;
		if (f && f.get_value() !== v) {
			f.set_value(v);
		}

		const p = location.pathname.split('/').filter(Boolean);
		if (p[0] === 'app' && p[1] === 'tianjy-statement') {
			history.replaceState({}, '', `/app/tianjy-statement/${encodeURIComponent(v)}`);
		}
		k++;
		let kk = k;
		const doc: any = await get_template(lastName);
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
		destroy = initShow(wrapper, meta, doc) || (() => {});
	}

	f = frappe.ui.form.make_control({
		df: {
			options: doctype,
			fieldtype: 'Link',
			label,
			onchange() {
				if (!f) { return; }
				const value = f.get_value();
				if (!value) { return; }
				update(value);
			},
			is_filter: 1,
			placeholder: label,
			condition: '=',
			input_class: 'input-xs',
		}, parent: $(head), only_input: true,
	});
	const p = location.pathname.split('/').filter(Boolean);
	if (p[0] === 'app' && p[1] === 'tianjy-statement') {
		const [,, name] = p;
		if (name) {
			update(decodeURIComponent(name));
		}
	}
	f.refresh();
	$(f.wrapper).attr('title', label);


};
