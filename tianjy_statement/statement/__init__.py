import json
import frappe
import frappe.permissions
import frappe.model.utils

from .doctype import get_data_by_doctype
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


@frappe.whitelist()
def get_data(name: str, ctx = {}):
	doc = get_template(name)
	if not doc: return
	doctype = doc.doc_type
	meta = frappe.get_meta(doctype)
	if isinstance(ctx, str): ctx = json.loads(ctx)
	filters = json.loads(doc.filters or '[]') + [[doctype, k, get_con(meta,k,v), v]  for k,v in ctx.items()]
	or_filters = json.loads(doc.or_filters or '[]')
	fields = set(v.field for v in doc.get('fields') or [])
	order_by = []
	# order_by: order?.map(v => {
	# 	const [field, desc] = typeof v === 'string' ? [v] : v;
	# 	return `${getFieldName(doctype, field)} ${desc ? 'DESC' : 'ASC'}`;
	# }).join(', ') || undefined,
	return get_data_by_doctype(meta, fields, filters,or_filters,order_by, ctx)
