import type { Template } from '../../../../public/js/types.mjs';
import render from '../../../../public/js/lib/render.mjs';
import create from '../../../../public/js/lib/create.mjs';
import make_standard_filters from '../../../../public/js/lib/makeFilters.mjs';


async function get_data(name: string, ctx: Record<string, any>) {
	return new Promise<any>((resolve, reject) => {
		frappe.call({
			method: 'tianjy_statement.statement.get_data',
			args: { name, ctx },
			callback(r) { resolve(r?.message || {list: [], ctx}); },
		}).fail(reject);
	});
}

const noop = () => {};
export default async function preview(
	name: string,
	doctype: string,
	template: Template,
	dataArea: [number, number],
	fieldArea: [number, number, field: string][],
	transposition: boolean,
	ctx: any,
) {
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
	const editor = create((dialog as any).fields_dict.show.wrapper, {height: '600px'});
	let k = 0;
	let destroyed = false;
	const update = async (data: any) => {
		if (destroyed) { return; }
		k++;
		const v = k;
		const {list, ctx, method} = await get_data(name, data);
		if (destroyed || v !== k) { return; }
		editor.value = render(template, dataArea, {ctx, method}, list, fieldArea, transposition);
	};
	make_standard_filters(meta.fields, (dialog as any).fields_dict.filters.wrapper, ctx, update);
	update({});
	await hidden;
	editor.destroy();
	destroyed = true;
}
