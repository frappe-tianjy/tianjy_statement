import { Template } from '../../../../public/js/types.mjs';
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
const noop = () => {};
export default async function show(doc: any) {
	const doctype: string = doc.doc_type;
	if (!doctype) {
		// eslint-disable-next-line no-alert
		alert('请先配置 doctype');
		return;
	}
	const template: Template | null =JSON.parse(doc.template || 'null');
	if (!template) {
		// eslint-disable-next-line no-alert
		alert('请先配置模板');
		return;
	}
	const dataArea: [number, number] = [doc.start_row, doc.end_row];
	const ctx = doc.quick_filters || [];
	const allFields = new Set((doc.fields || []).map((v: any) => v.field));
	let hide = noop;

	const hidden = new Promise<void>(r => { hide = () => r(); });

	const dialog = new frappe.ui.Dialog({
		// @ts-ignore
		title: __('Preview'),
		on_hide() { hide(); },
		fields: [
			{ fieldtype: 'HTML', fieldname: 'filters', label: '' },
			{ fieldtype: 'HTML', fieldname: 'show', label: '' },
		],
	});
	const modal = dialog.$wrapper[0]?.querySelector('.modal-dialog');
	const transitionend = modal ? new Promise<void>(r => {
		(modal as HTMLElement).addEventListener('transitionend', () => r(), { once: true });
	}) : Promise.resolve();
	dialog.show();

	const meta = frappe.get_meta(doctype) || await new Promise<locals.DocType>(resolve => {
		frappe.model.with_doctype(doctype, () => { resolve(frappe.get_meta(doctype)!); }, true);
	});


	await transitionend;
	const handsontable = createView((dialog as any).fields_dict.show.wrapper, '600px');
	let k = 0;
	let destroyed = false;
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
	make_standard_filters(meta, (dialog as any).fields_dict.filters.wrapper, ctx, update);
	update({});
	await hidden;
	handsontable.destroy();
	destroyed = true;


}
