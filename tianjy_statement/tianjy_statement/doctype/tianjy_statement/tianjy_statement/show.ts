import Handsontable from 'handsontable';
import HyperFormula from 'hyperformula';

import type { Layout } from './types.mjs';
import toSettings from './toSettings.mjs';
import render from './render.mjs';
import requestDocList from './requestDocList';


export default async function show(
	template: Layout | null,
	dataArea: [number, number],
	doctype: string,
	ctx: any,
) {
	if (!template) {
		alert('请先配置模板');
		return;
	}
	if (!doctype) {
		alert('请先配置 doctype');
		return;
	}
	let hide = () => { };
	const hidden = new Promise<void>(r => hide = () => r());

	const dialog = new frappe.ui.Dialog({
		// @ts-ignore
		title: __("测试微信模板消息"),
		on_hide() { hide(); },
		fields: [{ fieldtype: "HTML", fieldname: "show", label: '' }],
	});
	window.Dialog = dialog
	const modal = dialog.$wrapper[0]?.querySelector('.modal-dialog')
	const transitionend = modal ? new Promise<void>((r) => {
		(modal as HTMLElement).addEventListener('transitionend', () => r(), { once: true });
	}) : Promise.resolve();
	dialog.show();

	const meta = frappe.get_meta(doctype) || await new Promise<locals.DocType>(resolve => {
		frappe.model.with_doctype(doctype, () => { resolve(frappe.get_meta(doctype)!); }, true);
	});
	const rows = await requestDocList(meta, [
		...frappe.model.std_fields.map(v => typeof v === 'string' ? v : v.fieldname),
		...meta.fields.map(v => v.fieldname),
	]);
	await transitionend;
	const handsontable = new Handsontable((dialog as any).fields_dict.show.wrapper, {
		startRows: 8,
		startCols: 6,
		rowHeaders: true,
		colHeaders: true,
		height: '600px',
		manualColumnResize: true,
		manualRowResize: true,
		language: 'zh-CN',
		licenseKey: 'non-commercial-and-evaluation',
		formulas: { engine: HyperFormula },
		// cells: () => ({ readOnly: true }),
		...toSettings(render(template, dataArea, ctx, rows)),
	});
	await hidden;
	handsontable.destroy();


}
