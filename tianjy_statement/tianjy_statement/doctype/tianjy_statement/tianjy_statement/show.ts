import { Template } from '../../../../public/js/types.mjs';
import render from '../../../../public/js/lib/render.mjs';
import toSettings from '../../../../public/js/lib/toSettings.mjs';
import createView from '../../../../public/js/lib/createView.mjs';

import requestDocList from './requestDocList';
import make_standard_filters from './makeFilters.mjs';

export default async function show(
	template: Template | null,
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
	// eslint-disable-next-line unicorn/consistent-function-scoping
	let hide = () => { };
	const hidden = new Promise<void>(r => { hide = () => r(); });

	const dialog = new frappe.ui.Dialog({
		// @ts-ignore
		title: __('测试微信模板消息'),
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
	const update = async (ctx: any) => {
		k++;
		const v = k;
		const rows = await requestDocList(meta, [
			...frappe.model.std_fields.map(v => typeof v === 'string' ? v : v.fieldname),
			...meta.fields.map(v => v.fieldname),
		]);
		if (v !== k) { return; }
		handsontable.updateSettings(toSettings(render(template, dataArea, ctx, rows)));

	};
	const r = make_standard_filters(meta, (dialog as any).fields_dict.filters.wrapper, ctx, update);
	update({});
	await hidden;
	handsontable.destroy();


}
