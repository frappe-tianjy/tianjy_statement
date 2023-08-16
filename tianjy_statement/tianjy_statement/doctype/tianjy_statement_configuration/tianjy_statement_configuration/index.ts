// Copyright (c) 2023, 天玑 Tianjy and contributors
// For license information, please see license.txt

import HyperFormula from 'hyperformula';

import toSettings from '../../../../public/js/lib/toSettings.mjs';
import type { Template } from '../../../../public/js/types.mjs';
import createEditor from '../../../../public/js/lib/createEditor.mjs';

import preview from './preview';


interface Named {
	type?: string;
	field: string;
	text?: string;
}

function getNamed(named: Named[]) {
	const v = named.map(v => ({ name: `${v.type || 'ctx'}.${v.field}`, expression: v.text }));
	return v;
}

function createTable(root: HTMLElement, update: (v: Template) => void) {
	return createEditor(root, '600px', [], update);

}

function updateTemplateEditorNamed(frm: any) {
	const templateEditor = (frm as any).__templateEditor;
	if (!templateEditor) { return; }
	const formulas = templateEditor.getPlugin('formulas');
	formulas.disablePlugin();
	templateEditor.updateSettings({
		formulas: {
			engine: HyperFormula, namedExpressions: getNamed([
				...(frm.doc as any).fields || [],
				...(frm.doc as any).quick_filters || [],
			]),
		},
	});
	formulas.enablePlugin();

}
frappe.ui.form.on('Tianjy Statement Configuration', {
	refresh: function (frm) {
		frm.add_custom_button('Preview', () => { preview(frm.doc); });
		let templateEditor = (frm as any).__templateEditor;
		if (!templateEditor) {
			// @ts-ignore
			const root: HTMLElement = frm.fields_dict.template_editor.wrapper;
			const el = root.appendChild(document.createElement('div'));
			templateEditor = createTable(el, l => frm.set_value('template', JSON.stringify(l)));
			(frm as any).__templateEditor = templateEditor;
		}
		updateTemplateEditorNamed(frm);
		const value = JSON.parse((frm.doc as any).template || 'null');
		if (value) {
			templateEditor.updateSettings(toSettings(value));
		}
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
