from datetime import datetime, timedelta
import frappe
from frappe import _
import frappe.model.utils
from ..tianjy_statement.doctype.tianjy_statement_configuration.tianjy_statement_configuration import TianjyStatementConfiguration

def get_data_by_doctype(meta, fields, filters,or_filters, order_by, ctx):
	return dict(
		list=get_list(meta, fields, filters, or_filters, order_by),
		ctx=get_ctx(meta, ctx)
	)

def get_list(meta, fields, filters, or_filters, order_by):
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
		order_by=order_by,
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


def get_date_range_text(start, end):
	if start == end: return start
	s = datetime.strptime(start, '%Y-%m-%d')
	e = datetime.strptime(end, '%Y-%m-%d')
	sm = s - timedelta(1)
	ep = e + timedelta(1)
	if s.year - 1 == sm.year and e.year + 1 == ep.year:
		if s.year == e.year:
			return f"{s.year}年"
		else:
			return f"{s.year}年~{e.year}年"
	if (s.year - 1 == sm.year or s.month - 1 == sm.month) and (e.year + 1 == ep.year or e.month + 1 == ep.month):

		if s.year == e.year and s.month == e.month:
			return f"{s.year}年{s.month}月"
		elif s.year == e.year:
			return f"{s.year}年{s.month}月~{e.month}月"
		else:
			return f"{s.year}年{s.month}月~{e.year}年{e.month}月"
	return f"{start}~{end}"

def get_ctx(meta, ctx):
	linkOptions = {f.fieldname: f.options for f in meta.fields if f.fieldtype in ['Link', 'Tree Select']}
	dateFields = [f.fieldname for f in meta.fields if f.fieldtype in ['Date', 'Datetime']]
	def get(value, k):
		if not value: return value
		if k in dateFields:
			if not isinstance(value, list):
				return value
			start=value[0]
			end=value[1]
			return dict(start=start, end=end, _text=get_date_range_text(start, end))
		doctype = linkOptions.get(k, None)
		if not doctype: return value
		title = frappe.db.get_value(doctype, value, cache=True)
		if title: return _(title)
		return  value

	return { k: get(v, k) for k,v in ctx.items() }
