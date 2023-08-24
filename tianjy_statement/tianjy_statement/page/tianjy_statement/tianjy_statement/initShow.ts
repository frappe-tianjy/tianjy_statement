import render from '../../../../public/js/lib/render.mjs';
import toSettings from '../../../../public/js/lib/toSettings.mjs';
import createEditor from '../../../../public/js/lib/createEditor.mjs';
import exportXLSX from '../../../../public/js/lib/exportXLSX.mjs';
import readValue from '../../../../public/js/lib/readValue.mjs';
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


export default function initShow(
	body: HTMLElement,
	filterDiv: HTMLElement,
	meta: locals.DocType,
	doc: any,
	template: any,
): [destroy: () => void, exportXLSX: () => void] {
	const dataArea: [number, number] = [doc.start_row, doc.end_row];
	const ctx = doc.quick_filters || [];
	const {name} = doc;

	const handsontable = createEditor(body, '100%');
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
	return [() => {
		if (destroyed) { return; }
		destroyed = true;
		handsontable.destroy();
	}, () => {
		exportXLSX(readValue(handsontable, true));
	}];

}
