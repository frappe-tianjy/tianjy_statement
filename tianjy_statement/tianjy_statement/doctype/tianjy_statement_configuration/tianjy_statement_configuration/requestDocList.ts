function getFieldName(dt: string, field: string) {
	return frappe.model.get_full_column_name(field, dt);
}

const linkType = new Set(['Link', 'Tree Select']);
export default async function requestDocList(
	meta: locals.DocType,
	fields: string[],
	filters?: [string, string, string, any][],
	orFilters?: [string, string, string, any][][],
	order?: (string | [string, boolean?])[],
) {
	const doctype = meta.name;
	const fieldSet = new Set<string>();
	const titleField = meta.title_field;
	const links = new Map<string, {
		field: string;
		props: Set<string>;
	}>();
	function addLink(dt: string, titleField: string, prop: string) {
		const v = links.get(dt);
		if (v) { v.props.add(prop); return; }
		links.set(dt, { field: titleField, props: new Set([prop]) });
	}
	for (const field of fields) {
		fieldSet.add(getFieldName(doctype, field));
		const meta = frappe.get_meta(doctype);
		if (!meta) { continue; }
		let docField = meta.fields.find(f => f.fieldname === field);
		if (!docField) { continue; }
		if (docField.fieldtype === 'Dynamic Link') {
			const { options } = docField;
			if (!options) { continue; }
			docField = meta.fields.find(f => f.fieldname === options);
			if (!docField) { continue; }
			if (docField.fieldtype !== 'Link') { continue; }
			fieldSet.add(getFieldName(doctype, docField.fieldname));
		} else if (!linkType.has(docField.fieldtype)) { continue; }
		const { options } = docField;
		if (!options) { continue; }
		const { fieldname } = docField;
		if (fieldname === 'name') { continue; }
		const title_field = options === doctype
			? titleField
			: frappe.get_meta(options)?.title_field;
		if (!title_field) { continue; }
		addLink(options, title_field, fieldname);
	}
	const allLinks = new Map<string, {
		field: string;
		props: Set<string>;
	}>();

	for (const [k, { field, props }] of links) {
		if (k === doctype || props.size > 1) {
			allLinks.set(k, { field, props });
			continue;
		}
		const [fieldname] = props;
		const fieldSql = `${fieldname}.${field}`;
		const name = `${fieldname}.title`;
		fieldSet.add(`${fieldSql} as \`${name}\``);
	}
	const data = await frappe.call('frappe.desk.reportview.get', {
		doctype, fields: [...fieldSet], filters,
		order_by: order?.map(v => {
			const [field, desc] = typeof v === 'string' ? [v] : v;
			return `${getFieldName(doctype, field)} ${desc ? 'DESC' : 'ASC'}`
		}).join(', ') || undefined,
		start: 0,
		page_length: 0,
		view: 'List',
		guigu_or_filters: orFilters,
		with_comment_count: false,
	}).then((v: any) => v.message || {});
	Object.assign(frappe.boot.user_info, data.user_info);
	const values = !Array.isArray(data)
		? frappe.utils.dict(data.keys, data.values)
		: data;
	const promises: PromiseLike<any>[] = [];
	for (const [dt, { field, props }] of allLinks) {
		if (!frappe.perm.has_perm(dt)) { continue; }
		const list = [...props].map(p => values.map(v => v[p])).flat().filter(Boolean);
		promises.push(frappe.call('frappe.desk.reportview.get', {
			doctype: dt,
			fields: ['name', `\`${field}\` as \`title\``],
			filters: [[dt, 'name', 'in', [...new Set(list)]]],
			page_length: 0,
			view: 'List',
			with_comment_count: false,
		}).then((v: any) => v.message || {}).then(data => {
			Object.assign(frappe.boot.user_info, data.user_info);
			const mapValue = !Array.isArray(data)
				? frappe.utils.dict(data.keys, data.values)
				: data;
			const map = new Map(mapValue.map(v => [v.name, v.title]));
			for (const p of props) {
				for (const v of values) {
					const k = v[p];
					if (map.has(k)) {
						v[p] = map.get(k);
					}
				}
			}
		}));
	}
	await Promise.all(promises.map(p => p.then(null, () => { })));
	return values;
}
