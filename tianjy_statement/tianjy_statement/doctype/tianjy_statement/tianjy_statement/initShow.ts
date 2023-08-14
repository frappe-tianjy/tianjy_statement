import render from '../../../../public/js/lib/render.mjs';
import toSettings from '../../../../public/js/lib/toSettings.mjs';
import createView from '../../../../public/js/lib/createView.mjs';

import requestDocList from './requestDocList';
import make_standard_filters from './makeFilters.mjs';

function hideShow(frm: frappe.ui.form.Form) {
	// TODO: 隐藏第一个 Tab
	// window.frmfrm = frm;
	// @ts-ignore
	const root: HTMLElement = frm.fields_dict.show.wrapper;
	const el = root.appendChild(document.createElement('div'));
	el.appendChild(document.createTextNode('请先完成配置'));
	let destroyed = false;
	(frm as any).__destroyShow = () => {
		destroyed = true;
		(frm as any).__destroyShow = undefined;
		el.remove();
	};

}

async function getTitle(meta: locals.DocType, ctx: Record<string, any>) {
	const linkOptions = new Map(meta.fields
		.filter(v => v.fieldtype === 'Link')
		.map(v => [v.fieldname, v.options]));

	const list = await Promise.all(Object.entries(ctx).map(async ([k, v]) => {
		if (!v) { return [k, v] as [string, any]; }
		const doctype = linkOptions.get(k);
		if (!doctype) { return [k, v] as [string, any]; }
		const data = await frappe.call<any>('frappe.client.validate_link', { doctype, docname: v });
		const name = data?.message?.name;
		return [k, name || v] as [string, any];
	}));
	return Object.fromEntries(list);

}
export default async function initShow(frm: frappe.ui.form.Form) {
	(frm as any).__destroyShow?.();
	if (frm.is_new()) { return hideShow(frm); }
	const doc = frm.doc as any;
	const doctype = doc.doc_type;
	if (!doctype) { return hideShow(frm); }

	const template = JSON.parse(doc.template || 'null');
	if (!template) { return hideShow(frm); }
	const dataArea: [number, number] = [doc.start_row, doc.end_row];
	const ctx = (frm.doc as any).quick_filters || [];


	// @ts-ignore
	const root: HTMLElement = frm.fields_dict.show.wrapper;
	const filterDiv = root.appendChild(document.createElement('div'));
	const el = root.appendChild(document.createElement('div'));
	const handsontable = createView(el, '600px');
	let destroyed = false;
	(frm as any).__destroyShow = () => {
		destroyed = true;
		(frm as any).__destroyShow = undefined;
		handsontable.destroy();
		filterDiv.remove();
		el.remove();
	};


	const meta = frappe.get_meta(doctype) || await new Promise<locals.DocType>(resolve => {
		frappe.model.with_doctype(doctype, () => { resolve(frappe.get_meta(doctype)!); }, true);
	});


	let k = 0;
	const update = async (data: any) => {
		if (destroyed) { return; }
		k++;
		const v = k;
		const [rows, ctx] = await Promise.all([requestDocList(meta, [
			...frappe.model.std_fields.map(v => typeof v === 'string' ? v : v.fieldname),
			...meta.fields.map(v => v.fieldname),
		]), getTitle(meta, data)]);
		if (destroyed) { return; }
		if (v !== k) { return; }
		handsontable.updateSettings(toSettings(render(template, dataArea, ctx, rows)));

	};
	make_standard_filters(meta, filterDiv, ctx, update);
	update({});


}
