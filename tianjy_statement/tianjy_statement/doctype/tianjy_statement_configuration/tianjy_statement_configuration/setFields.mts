import { filterFieldtype } from '../../../../public/js/lib/makeFilters.mjs';

export default async function setFields(frm: frappe.ui.form.Form) {
	// get the doctype to update fields
	const doc = frm.doc as any;
	if (!doc.doc_type) { return; }
	await new Promise(r => frappe.model.with_doctype(doc.doc_type, r));

	const fields = frappe.get_meta(doc.doc_type)?.fields || [];
	frm.fields_dict.fields.grid.update_docfield_property('field', 'options', fields
		.filter(d => !frappe.model.no_value_type.includes( d.fieldtype))
		.map(d => ({
			value: d.fieldname,
			label: `${__(d.label || d.fieldname)} (${d.fieldname})`,
		})));
	frm.fields_dict.quick_filters.grid.update_docfield_property('field', 'options', fields
		.filter(d => filterFieldtype(d.fieldtype))
		.map(d => ({
			value: d.fieldname,
			label: `${__(d.label || d.fieldname)} (ctx.${d.fieldname})`,
		})));
}
