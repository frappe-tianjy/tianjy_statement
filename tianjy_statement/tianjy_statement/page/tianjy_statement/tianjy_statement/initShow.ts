import render from '../../../../public/js/lib/render.mjs';
import toSettings from '../../../../public/js/lib/toSettings.mjs';
import createView from '../../../../public/js/lib/createView.mjs';

import requestDocList from './requestDocList';
import make_standard_filters from './makeFilters.mjs';


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


export default function initShow(
	root: HTMLElement,
	meta: locals.DocType,
	doc: any,
) {

	const template = JSON.parse(doc.template || 'null');
	if (!template) { return; }
	const dataArea: [number, number] = [doc.start_row, doc.end_row];
	const ctx = doc.quick_filters || [];
	const allFields = new Set((doc.fields || []).map((v: any) => v.field));


	const filterDiv = root.appendChild(document.createElement('div'));
	const el = root.appendChild(document.createElement('div'));
	el.style.flex = '1';
	const handsontable = createView(el, '100%');
	let destroyed = false;

	let k = 0;
	const update = async (data: any) => {
		if (destroyed) { return; }
		k++;
		const v = k;
		const fields = [
			...frappe.model.std_fields.map(v => typeof v === 'string' ? v : v.fieldname),
			...meta.fields
				.filter(v => !frappe.model.no_value_type.includes(v.fieldtype))
				.map(v => v.fieldname),
		].filter(v => allFields.has(v));
		const [rows, ctx] = await Promise.all([
			requestDocList(meta, fields),
			getTitle(meta, data),
		]);
		if (destroyed) { return; }
		if (v !== k) { return; }
		handsontable.updateSettings(toSettings(render(template, dataArea, ctx, rows)));

	};
	make_standard_filters(meta, filterDiv, ctx, update);
	update({});
	return () => {
		if (destroyed) { return; }
		destroyed = true;
		handsontable.destroy();
		filterDiv.remove();
		el.remove();
	};

}
