import render from '../../../../public/js/lib/render.mjs';
import toSettings from '../../../../public/js/lib/toSettings.mjs';
import createView from '../../../../public/js/lib/createView.mjs';

import make_standard_filters from './makeFilters.mjs';

async function get_data(name: string, ctx: Record<string, any>) {
	return new Promise<any>((resolve, reject) => {
		frappe.call({
			method: 'tianjy_statement.statement.get_data',
			args: { name, ctx },
			callback(r) { resolve(r?.message || {list: [], ctx}); },
		}).fail(reject);
	});
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
	const {name} = doc;

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
		const {list, ctx} = await get_data(name, data);
		if (destroyed || v !== k) { return; }
		handsontable.updateSettings(toSettings(render(template, dataArea, ctx, list)));

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
