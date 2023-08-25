// Copyright (c) 2023, 天玑 Tianjy and contributors
// For license information, please see license.txt

import type { Template, XLSXEditor } from '../../../../public/js/types.mjs';
import create from '../../../../public/js/lib/create.mjs';

import preview from './preview';
import setFields from './setFields.mjs';


interface Named {
	type?: string;
	field: string;
	text?: string;
}

function getNamed(named: Named[]) {
	const v = named.map(v => ({ name: `${v.type || 'ctx'}.${v.field}`, expression: v.text }));
	return v;
}


function updateTemplateEditorNamed(frm: any) {
	const templateEditor: XLSXEditor = (frm as any).__templateEditor;
	if (!templateEditor) { return; }
	templateEditor.namedExpressions = getNamed([
		...(frm.doc as any).fields || [],
		...(frm.doc as any).quick_filters || [],
	]);
}
frappe.ui.form.on('Tianjy Statement Configuration', {
	refresh: function (frm) {
		setFields(frm);
		if (!frm.is_new()) {
			const doc = {...frm.doc as any};
			const doctype: string = doc.doc_type;
			const template: Template | null =JSON.parse(doc.template || 'null');
			if (doctype && template) {
				const dataArea: [number, number] = [doc.start_row, doc.end_row];
				const {name} = doc;
				const quickFilters = doc.quick_filters;
				frm.add_custom_button('Preview', () => {
					preview(name, doctype, template, dataArea, quickFilters);
				});
				const url = `/app/tianjy-statement/${doc.name}`;
				frm.add_custom_button(`<a href="${url}">${__('查看')}</a>`, () => {

				});
			}
		}
		(frm as any).__templateEditorDestroy?.();
		// @ts-ignore
		const root: HTMLElement = frm.fields_dict.template_editor.wrapper;
		const el = root.appendChild(document.createElement('div'));
		const doc = {...frm.doc as any};
		const templateEditor = create(
			el,
			'600px',
			getNamed([ ...doc.fields || [], ...doc.quick_filters || [] ]),
			l => frm.set_value('template', JSON.stringify(l)),
		);
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
