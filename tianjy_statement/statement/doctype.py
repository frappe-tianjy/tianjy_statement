from datetime import datetime, timedelta
from typing import Any
import frappe
from frappe import _
from frappe.model.meta import Meta
import frappe.model.utils
from ..tianjy_statement.doctype.tianjy_statement_configuration.tianjy_statement_configuration import TianjyStatementConfiguration

def get_data_by_doctype(meta, fields, filters,or_filters, order_by, ctx):
	return dict(
		list=get_list(meta, fields, filters, or_filters, order_by),
		ctx=get_ctx(meta, ctx)
	)

def query(meta: Meta, fields: set[str], filters, or_filters, order_by):

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
		fieldtype = docField.fieldtype
		if fieldtype == 'Select':
			for v in values:
				if k:= v[field]: v[field] = _(k)
			continue
		if fieldtype not in ['Link', 'Tree Select']:
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

def get_list(meta: Meta, requestFields: set[str], filters, or_filters, order_by):
	allFields = (
		set(frappe.model.utils.STANDARD_FIELD_CONVERSION_MAP.keys()) |
		set(v.fieldname for v in meta.fields if v.fieldtype not in frappe.model.no_value_fields)
	)

	values = query(meta, allFields & (requestFields | set(['name'])), filters, or_filters, order_by)
	if not values: return []


	field_map: dict[str, set[str]] = dict()
	for field in requestFields:
		if '.' not in field: continue
		main_field, sub_field = field.split('.')
		if main_field in field_map:
			field_map[main_field].add(sub_field)
		else:
			field_map[main_field] = set([sub_field])
	if not field_map: return values


	value_map: dict[str, Any] = dict()
	for value in values:
		value_map[value.name] = value
	names = [v.name for v in values]

	for main_field, sub_fields in field_map.items():
		fields = meta.get('fields', {'fieldname': main_field, 'fieldtype': 'Table'})
		if not fields: continue
		field = fields[0]
		sub_meta = frappe.get_meta(field.options)
		allFields = (
			set(frappe.model.utils.STANDARD_FIELD_CONVERSION_MAP.keys()) |
			set(v.fieldname for v in sub_meta.fields if v.fieldtype not in frappe.model.no_value_fields)
		)
		sub_docs = query(sub_meta, allFields & sub_fields | set(['parent']), filters = {
			'parent': ('in', names),
			'parenttype': meta.name,
			'parentfield': main_field,
		}, or_filters = [], order_by = 'idx')
		if not sub_docs: continue
		sub_doc_map: dict[str, list] = dict()
		for sub_doc in sub_docs:
			parent = sub_doc.parent
			if parent in sub_doc_map:
				sub_doc_map[parent].append(sub_doc)
			else:
				sub_doc_map[parent] = [sub_doc]
		for value in values:
			value[main_field] = sub_doc_map.get(value.name, [])

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
		meta = frappe.get_meta(doctype)
		fieldname = meta.title_field or 'name' # type: ignore
		title = frappe.db.get_value(doctype, value, fieldname, cache=True)
		if title: return _(title)
		return _(value)

	return { k: get(v, k) for k,v in ctx.items() }
