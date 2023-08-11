// Copyright (c) 2023, 天玑 Tianjy and contributors
// For license information, please see license.txt

import HyperFormula from 'hyperformula';
import Handsontable from 'handsontable';
import 'handsontable/languages';
import { registerAllModules } from 'handsontable/registry';

import toSettings from '../../../../public/js/lib/toSettings.mjs';
import readValue from '../../../../public/js/lib/readValue.mjs';
import type { Template } from '../../../../public/js/types.mjs';
import { customStylesRenderer } from '../../../../public/js/lib/customStylesRenderer.mjs';
import rendererStyleMenu from '../../../../public/js/lib/rendererStyleMenu.mjs';

import show from './show';

registerAllModules();

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
	const table = new Handsontable(root, {
		startRows: 8,
		startCols: 6,
		rowHeaders: true,
		colHeaders: true,
		contextMenu: {
			items: {
				row_above: {},
				row_below: {},
				hr0: '---------',
				col_left: {},
				col_right: {},
				hr1: '---------',
				remove_row: {},
				remove_col: {},
				hr2: '---------',
				undo: {},
				redo: {},
				hr3: '---------',
				make_read_only: {},
				hr4: '---------',
				alignment: {},
				hr5: '---------',
				copy: {},
				cut: {},
				hr6: '---------',
				mergeCells: {},
				hr7: '---------',
				style: {
					renderer() {
						return rendererStyleMenu(table);
					},
					disableSelection: false,
					isCommand: true,
				},
			},
		},
		manualColumnResize: true,
		manualRowResize: true,
		mergeCells: [],
		height: '600px',
		language: 'zh-CN',
		renderer: customStylesRenderer,
		licenseKey: 'non-commercial-and-evaluation',
		// @ts-ignore
		formulas: { engine: HyperFormula, namedExpressions: [] },
	});
	let timeout: any;
	const up = () => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			update(readValue(table));
		}, 0);
	};
	table.updateSettings({
		afterMergeCells: up,
		afterUnmergeCells: up,
		afterColumnResize: up,
		afterRowResize: up,
		afterChange: up,
		afterSetCellMeta: up,
	});
	return table;

}

function updateTemplateEditorNamed(frm: any) {
	const templateEditor = (frm as any).__templateEditor;
	if (!templateEditor) { return; }
	const formulas = templateEditor.getPlugin('formulas');
	formulas.disablePlugin();
	templateEditor.updateSettings({
		formulas: {
			engine: HyperFormula, namedExpressions: getNamed([
				...(frm.doc as any).demo || [],
				...(frm.doc as any).quick_filters || [],
			]),
		},
	});
	formulas.enablePlugin();

}
frappe.ui.form.on('Tianjy Statement', {
	refresh: function (frm) {
		frm.add_custom_button('Show', () => {
			const doc = frm.doc as any;
			show(
				JSON.parse(doc.template || 'null'),
				[doc.start_row, doc.end_row],
				doc.doc_type,
				Object.fromEntries(((frm.doc as any).quick_filters || []).map((v: any) => [v.field, v.text])),
			);
		});
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

frappe.ui.form.on('Tianjy Statement Demo', {
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
