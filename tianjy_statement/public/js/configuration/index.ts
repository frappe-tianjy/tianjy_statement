// Copyright (c) 2023, 天玑 Tianjy and contributors
// For license information, please see license.txt

import type { XLSXEditor } from '../types.mjs';
import create from '../lib/create.mjs';

import setFields from './setFields.mjs';
import setAreaFields from './setAreaFields.mjs';


function parseText(t?: string) {
	if (!t) { return t; }
	try {
		return JSON.parse(t);
	} catch {
		return t;
	}
}


function getAllNamed(doc: any) {
	const named: Record<string, any> = {};
	function get(name: string, value: any) {
		if (['number', 'boolean', 'bigint', 'string'].includes(typeof value)) {
			if (name) {
				named[name] = value;
			}
			return;
		}
		if (!value || typeof value !== 'object') {
			if (name) {
				named[name] = '';
			}
			return;
		}

		if (name) {
			for (const [k, v] of Object.entries(value)) {
				get(`${name}.${k}`, v);
			}
		} else {
			for (const [k, v] of Object.entries(value)) {
				get(k, v);
			}
			return;
		}

		for (const k of ['_value', '_text', 'value', 'text']) {
			const r = value[k];
			if (['number', 'boolean', 'bigint', 'string'].includes(typeof r)) {
				named[name] = r;
				return;
			}
		}
		named[name] = String(value);
	}
	for (const v of doc.methods || []) {
		get(`method.${v.field}`, parseText(v.text));
	}
	for (const v of doc.quick_filters || []) {
		get(`ctx.${v.field}`, v.text);
	}
	for (const v of doc.fields || []) {
		get(`${v.type || 'data'}.${v.field}`, v.text);
	}
	get(`index`, {row: 1, data: 1, sub: 1});
	named['data.name'] = 'name';
	return named;

}

function updateTemplateEditorNamed(frm: any) {
	const templateEditor: XLSXEditor = (frm as any).__templateEditor;
	if (!templateEditor) { return; }
	templateEditor.namedExpressions = getAllNamed(frm.doc);
}
frappe.ui.form.on('Tianjy Statement Configuration', {
	refresh: function (frm) {
		setFields(frm).finally(() => setAreaFields(frm));
		if (!frm.is_new()) {
			const url = `/app/tianjy-statement/${frm.doc.name}`;
			frm.add_custom_button(`<a href="${url}">${__('查看')}</a>`, () => {});
		}
		(frm as any).__templateEditorDestroy?.();
		// @ts-ignore
		const root: HTMLElement = frm.fields_dict.template_editor.wrapper;
		const el = root.appendChild(document.createElement('div'));
		const doc = {...frm.doc as any};
		const templateEditor = create(el, {
			height: '600px',
			names: getAllNamed(doc),
		}, e => {
			const l = e.value;
			if (!l) { return; }
			const template =JSON.stringify(l);
			if (template === (frm.doc as any).template) { return; }
			frm.set_value('template', template);
		});
		(frm as any).__templateEditor = templateEditor;
		(frm as any).__templateEditorDestroy = () => {
			delete (frm as any).__templateEditorDestroy;
			templateEditor.destroy();
			el.remove();
			if ((frm as any).__templateEditor === templateEditor) {
				delete (frm as any).__templateEditor;
			}
		};
		const value = JSON.parse(doc.template || 'null');
		if (value) { templateEditor.value = value; }
	},
	doc_type: function (frm) {
		setFields(frm);
	},
});

frappe.ui.form.on('Tianjy Statement Field', {
	type(frm) {
		updateTemplateEditorNamed(frm);
	},
	field(frm) {
		updateTemplateEditorNamed(frm);
		setAreaFields(frm);
	},
	text(frm) {
		updateTemplateEditorNamed(frm);
	},
	demo_remove(frm) {
		updateTemplateEditorNamed(frm);
	},
});
frappe.ui.form.on('Tianjy Statement Quick Filter', {
	field(frm) {
		updateTemplateEditorNamed(frm);
	},
	text(frm) {
		updateTemplateEditorNamed(frm);
	},
	quick_filters_remove(frm) {
		updateTemplateEditorNamed(frm);

	},
});
function renderMethodShow(frm: any, cdn: string) {
	const row = frm.fields_dict.methods.grid.grid_rows.find(v => v.doc.name === cdn);
	if (!row) { return; }
	const wrapper: HTMLElement | undefined = row.grid_form
		?.fields_dict
		?.show
		?.wrapper;
	if (!wrapper) { return; }
	wrapper.innerHTML = '';
	const {doc} = row;
	const {desc} = doc;
	if (desc) {
		const descPre = wrapper.appendChild(document.createElement('pre'));
		descPre.innerText = doc.desc;
		wrapper.appendChild(document.createElement('br'));
	}
	wrapper.appendChild(document.createElement('div')).innerText = '示例：';
	const pre = wrapper.appendChild(document.createElement('pre'));
	pre.innerText = JSON.stringify(parseText(doc.text), null, '\t');
	pre.style.tabSize = '4';
}
frappe.ui.form.on('Tianjy Statement Method', {
	form_render(frm, cdt, cdn) {
		renderMethodShow(frm, cdn);
	},
	field(frm) {
		updateTemplateEditorNamed(frm);
	},
	async method(frm, cdt, cdn) {
		const method = frappe.get_doc(cdt, cdn)?.method;
		if (!method) { return; }

		const data = await frappe.call('tianjy_statement.statement.get_method', {method});
		const message = data?.message;
		if (!message) { return; }

		const doc = frappe.get_doc(cdt, cdn);
		if (method !== doc?.method) { return; }

		doc.text = JSON.stringify(message.example);
		doc.desc = message.desc ?? '';
		renderMethodShow(frm, cdn);
		frm.refresh_field('methods');

		updateTemplateEditorNamed(frm);
	},
	text(frm) {
		updateTemplateEditorNamed(frm);
	},
	methods_remove(frm) {
		updateTemplateEditorNamed(frm);

	},
});
