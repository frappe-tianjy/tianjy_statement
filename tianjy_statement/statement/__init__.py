import json
import frappe
from frappe import _
import frappe.permissions
import frappe.model.utils

from .doctype import get_data_by_doctype, set_data_by_doctype, create_by_doctype
from ..tianjy_statement.doctype.tianjy_statement_configuration.tianjy_statement_configuration import TianjyStatementConfiguration

@frappe.whitelist()
def get_list():
	...

@frappe.whitelist()
def get_template(name: str):
	doc = frappe.get_doc(TianjyStatementConfiguration.DOCTYPE, name)
	if frappe.permissions.has_permission(doc.doctype, "read", doc, raise_exception=False):
		return doc

	if set(frappe.get_roles()) & set(p.role for p in doc.get('permissions') or []):
		return doc
	doc.raise_no_permission_to('read')


def get_con(meta,k,v):
	if not isinstance(v, list): return '='
	if not meta.get('fields', dict(fieldname=k, fieldtype=('in', ['Date', 'Datetime']))): return '='
	return 'Between'


def get_method_value(field: str, method: str, **args):
	try:
		fn = frappe.get_attr(method)
	except Exception:
		return f'方法 `{field}: {method}` 不存在'
	from .. import whitelisted
	if fn not in whitelisted:
		return f'方法 `{field}: {method}` 不在白名单中'
	return frappe.call(fn, **args)

@frappe.whitelist()
def get_data(name: str, ctx = {}):
	statement = get_template(name)
	if not statement: return
	doctype = statement.doc_type
	meta = frappe.get_meta(doctype)
	if isinstance(ctx, str): ctx = json.loads(ctx)
	ctx_filters = [[doctype, k, get_con(meta,k,v), v]  for k,v in ctx.items()]
	must_filters = json.loads(statement.filters or '[]')
	filters = must_filters + ctx_filters
	or_filters = json.loads(statement.or_filters or '[]')
	fields = set(v.field for v in statement.get('fields') or [])
	order_by = []
	# order_by: order?.map(v => {
	# 	const [field, desc] = typeof v === 'string' ? [v] : v;
	# 	return `${getFieldName(doctype, field)} ${desc ? 'DESC' : 'ASC'}`;
	# }).join(', ') || undefined,
	res = get_data_by_doctype(meta, fields, filters,or_filters,order_by, ctx)

	return dict(method={
		m.get('field'): get_method_value(
			m.get('field'),
			m.get('method'),
			ctx=ctx,
			meta=meta,
			statement=statement,
		) for m in statement.get('methods')
	}, **res);

@frappe.whitelist()
def save_data(name: str, data):
	statement = get_template(name)
	if not statement: return
	doctype = statement.doc_type
	meta = frappe.get_meta(doctype)
	if isinstance(data, str): data = json.loads(data)
	fields = set(v.field for v in statement.get('fields') or [])
	set_data_by_doctype(meta, fields, data)

@frappe.whitelist()
def create(name: str, data):
	statement = get_template(name)
	if not statement: return
	doctype = statement.doc_type
	meta = frappe.get_meta(doctype)
	if isinstance(data, str): data = json.loads(data)
	for dt,k,c, v in json.loads(statement.filters or '[]'):
		if dt != doctype: continue;
		if c != '=': continue;
		data[k] = v
	create_by_doctype(meta, data)

@frappe.whitelist()
def get_method(method: str):
	try:
		fn = frappe.get_attr(method)
	except Exception:
		return None
	from .. import whitelisted
	if fn not in whitelisted:
		return None
	p = whitelisted[fn]
	return p
