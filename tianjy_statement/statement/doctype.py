from datetime import datetime, timedelta, date
from typing import Any
from .utils import datetime_to_obj
import frappe
from frappe import _
from frappe.model.meta import Meta
import frappe.model.utils
from ..tianjy_statement.doctype.tianjy_statement_configuration.tianjy_statement_configuration import TianjyStatementConfiguration

link_types = set(['Link', 'Tree Select', 'Tianjy Related Link'])
def get_data_by_doctype(meta, fields, filters,or_filters, order_by, ctx):
	return dict(
		list=get_list(meta, fields, filters, or_filters, order_by),
		fields=get_fields(meta, fields),
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
		if fieldtype in ('Date', 'Datetime', 'Guigu Date'):
			for value in values:
				if v:= value[field]:
					if isinstance(v, str):
						v = datetime.strptime(v, '%Y-%m-%d')
					elif isinstance(v, date):
						v = datetime(v.year, v.month, v.day)
					if isinstance(v, datetime):
						value[field] = datetime_to_obj(v, docField.options)
			continue
		if fieldtype == 'Select':
			for v in values:
				if k:= v[field]: v[field] = {'value': k, 'label': _(k)}
			continue
		if fieldtype == 'Tianjy Enumeration':
			dt = 'Tianjy Enumeration Value'
			if dt in links:
				links[dt].add(field);
			else:
				links[dt] = set([field])
		if fieldtype not in link_types:
			continue
		options = docField.options
		if not options: continue;
		dt = options.split('\n', 1)
		if not dt: continue
		dt = dt[0]
		if not dt: continue
		if dt == '[Select]': continue
		if dt in links:
			links[dt].add(field);
		else:
			links[dt] = set([field])

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
				if k in map: v[p] = {'value': k, 'label': map[k]}

	return values

def get_fields(meta: Meta, requestFields: set[str]):
	allFields = (
		set(frappe.model.utils.STANDARD_FIELD_CONVERSION_MAP.keys()) |
		set(v.fieldname for v in meta.fields if v.fieldtype not in frappe.model.no_value_fields)
	)

	all_fields = {}
	for field in meta.get('fields', {'fieldname': ('in', list(allFields & requestFields))}):
		all_fields[field.fieldname] = field


	field_map: dict[str, set[str]] = get_field_map(requestFields)
	if not field_map: return all_fields


	for main_field, sub_fields in field_map.items():
		fields = meta.get('fields', {'fieldname': main_field, 'fieldtype': ('in', list(frappe.model.table_fields))})
		if not fields: continue
		field = fields[0]
		sub_meta = frappe.get_meta(field.options)
		allFields = set(v.fieldname for v in sub_meta.fields if v.fieldtype not in frappe.model.no_value_fields)
		for field in sub_meta.get('fields', {'fieldname': ('in', list(allFields & sub_fields))}):
			all_fields[main_field + '.' + field.fieldname] = field

	return all_fields


def get_field_map(requestFields: set[str]):
	field_map: dict[str, set[str]] = dict()
	for field in requestFields:
		if '.' not in field: continue
		main_field, sub_field = field.split('.')
		if main_field in field_map:
			field_map[main_field].add(sub_field)
		else:
			field_map[main_field] = set([sub_field])
	return field_map

def get_list(meta: Meta, requestFields: set[str], filters, or_filters, order_by):
	allFields = (
		set(frappe.model.utils.STANDARD_FIELD_CONVERSION_MAP.keys()) |
		set(v.fieldname for v in meta.fields if v.fieldtype not in frappe.model.no_value_fields)
	)

	values = query(meta, allFields & requestFields | set(['name']), filters, or_filters, order_by)
	if not values: return []


	field_map: dict[str, set[str]] = get_field_map(requestFields)
	if not field_map: return values


	value_map: dict[str, Any] = dict()
	for value in values:
		value_map[value.name] = value
	names = [v.name for v in values]

	for main_field, sub_fields in field_map.items():
		fields = meta.get('fields', {'fieldname': main_field, 'fieldtype': ('in', list(frappe.model.table_fields))})
		if not fields: continue
		field = fields[0]
		sub_meta = frappe.get_meta(field.options)
		allFields = (
			set(frappe.model.utils.STANDARD_FIELD_CONVERSION_MAP.keys()) |
			set(v.fieldname for v in sub_meta.fields if v.fieldtype not in frappe.model.no_value_fields)
		)
		sub_docs = query(sub_meta, allFields & sub_fields | set(['parent', 'name']), filters = {
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
	base_date_fields = {f.fieldname: f.options for f in meta.fields if f.fieldtype in ['Guigu Date']}
	def get(value, k):
		if not value: return value
		if k in base_date_fields:
			if not isinstance(value, str): return value
			return datetime_to_obj(datetime.strptime(value, '%Y-%m-%d'), base_date_fields[k])
		if k in dateFields:
			if not isinstance(value, list):
				return value
			start=value[0]
			end=value[1]
			return dict(
				start=datetime_to_obj(datetime.strptime(start, '%Y-%m-%d')),
				end=datetime_to_obj(datetime.strptime(end, '%Y-%m-%d')),
				_text=get_date_range_text(start, end),
			)
		doctype = linkOptions.get(k, None)
		if not doctype: return value
		meta = frappe.get_meta(doctype)
		fieldname = meta.title_field or 'name' # type: ignore
		title = frappe.db.get_value(doctype, value, fieldname, cache=True)
		if title: return _(title)
		return _(value)

	return { k: get(v, k) for k,v in ctx.items() }


def set_data_by_doctype(meta, requestFields: set[str], data: dict):
	base_fields = (
		set(frappe.model.utils.STANDARD_FIELD_CONVERSION_MAP.keys()) |
		set(v.fieldname for v in meta.fields if v.fieldtype not in frappe.model.no_value_fields)
	) & requestFields
	if 'name' in base_fields: base_fields.remove('name')

	field_map: dict[str, set[str]] = get_field_map(requestFields)

	subfields: dict[str, set[str]] = dict()
	for main_field, sub_fields in field_map.items():
		fields = meta.get('fields', {'fieldname': main_field, 'fieldtype': 'Table'})
		if not fields: continue
		field = fields[0]
		sub_meta = frappe.get_meta(field.options)
		allFields = (
			set(frappe.model.utils.STANDARD_FIELD_CONVERSION_MAP.keys()) |
			set(v.fieldname for v in sub_meta.fields if v.fieldtype not in frappe.model.no_value_fields)
		) & sub_fields
		if 'name' in allFields: allFields.remove('name')
		if 'parent' in allFields: allFields.remove('parent')
		if 'parenttype' in allFields: allFields.remove('parenttype')
		if 'parentfield' in allFields: allFields.remove('parentfield')
		if not allFields: continue
		subfields[main_field] = allFields

	dt = meta.name
	for name, values in data.items():
		doc = frappe.get_doc(dt, name)
		for field, value in values.items():
			if isinstance(value, (str, int, float, bool)):
				if field not in base_fields: continue
				doc.set(field, value)
			elif isinstance(value, dict):
				if field not in subfields: continue
				fields = subfields[field]
				for sub_name, sub_value in value.items():
					if not isinstance(sub_name, (str, int)): continue
					if not isinstance(sub_value, dict): continue
					sub_docs = doc.get(field, {'name': sub_name})
					if not sub_docs: continue
					sub_doc = sub_docs[0]
					for k,v in sub_value.items():
						if k not in fields: continue
						if not isinstance(v, (str, int, float, bool)): continue
						sub_doc.set(k, v)
		doc.save()


def create_by_doctype(meta, data: dict):
	doc = frappe.new_doc(meta.name)
	for k,v in data.items():
		doc.set(k,v)
	doc.save()
