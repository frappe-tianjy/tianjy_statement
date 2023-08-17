import frappe
import frappe.model.utils
from ..tianjy_statement.doctype.tianjy_statement_configuration.tianjy_statement_configuration import TianjyStatementConfiguration

def get_data_by_doctype(meta, fields, filters,or_filters, ctx):
	return dict(
		list=get_list(meta, fields, filters, or_filters),
		ctx=get_ctx(meta, ctx)
	)

def get_list(meta, fields, filters, or_filters):
	# Map<string, { field: string; props: Set<string>; }>

	fields = (
		set(frappe.model.utils.STANDARD_FIELD_CONVERSION_MAP.keys()) |
		set(v.fieldname for v in meta.fields if v.fieldtype not in frappe.model.no_value_fields)
	) & fields

	doctype = meta.name

	values = frappe.get_all(
		doctype,
		fields=list(fields),
		filters=filters,
		guigu_or_filters=or_filters,
		order_by=[],
		# order_by: order?.map(v => {
		# 	const [field, desc] = typeof v === 'string' ? [v] : v;
		# 	return `${getFieldName(doctype, field)} ${desc ? 'DESC' : 'ASC'}`;
		# }).join(', ') || undefined,
		page_length=0,
	)

	links: dict[str, set[str]] = {}
	for field in fields:
		docFields = meta.get('fields', filters={'fieldname': field});
		docField = docFields[0] if docFields else None
		if not docField: continue;
		if docField.fieldtype not in ['Link', 'Tree Select']:
			continue
		options = docField.options
		if not options: continue;
		if options in links:
			links[options].add(field);
		else:
			links[options] = set([field])

	for dt, props in links.items():
		field = frappe.get_meta(dt).get('title_field');
		if not field: continue
		names = [v[p] for v in values for p in props if v[p]]
		mapValue = frappe.get_all(
			dt,
			fields=['name', f"`{field}` as `title`"],
			filters= [[dt, 'name', 'in', [v for v in set(names)]]],
			page_length=0,
		)
		map = {v.name: v.title for v in mapValue}
		for p in props:
			for v in values:
				k = v[p]
				if k in map: v[p] = map[k]
	return values

def get_ctx(meta, ctx):
	linkOptions = {f.fieldname: f.options for f in meta.fields if f.fieldtype in ['Link', 'Tree Select']}
	def get(value, doctype):
		if not value: return value
		if not doctype: return value
		return frappe.db.get_value(doctype, value, cache=True) or value

	return { k: get(v, linkOptions.get(k, None)) for k,v in ctx.items() }
