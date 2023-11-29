import { filterFieldtype } from '../../../../public/js/lib/makeFilters.mjs';

function getDataFields(doc_type) {
	const fields = frappe.get_meta(doc_type)?.fields || [];
	const dataFields = fields
		.filter(d => !frappe.model.no_value_type.includes( d.fieldtype))
		.map(d => ({
			value: d.fieldname,
			label: `${__(d.label || d.fieldname)} (${d.fieldname})`,
		}));
	for (const field of fields) {
		if (!frappe.model.table_fields.includes(field.fieldtype)) { continue; }
		const fields = frappe.get_meta(field.options)?.fields;
		if (!fields) { continue; }
		const {fieldname} = field;
		const label = __(field.label || field.fieldname);
		for (const field of fields) {
			if (frappe.model.no_value_type.includes(field.fieldtype)) { continue; }
			const value = `${fieldname}.${field.fieldname}`;
			dataFields.push({
				value,
				label:`${label}的${__(field.label || field.fieldname)} (${value})`,
			});
		}
	}
	return dataFields;
}

export default async function setFields(frm: frappe.ui.form.Form) {
	// get the doctype to update fields
	const doc = frm.doc as any;
	if (!doc.doc_type) { return; }
	await new Promise(r => frappe.model.with_doctype(doc.doc_type, r));
	const dataFields = getDataFields(doc.doc_type);
	frm.fields_dict.fields.grid.update_docfield_property('field', 'options', dataFields);
	const fields = frappe.get_meta(doc.doc_type)?.fields || [];
	frm.fields_dict.quick_filters.grid.update_docfield_property('field', 'options', fields
		.filter(d => filterFieldtype(d.fieldtype))
		.map(d => ({
			value: d.fieldname,
			label: `${__(d.label || d.fieldname)} (ctx.${d.fieldname})`,
		})));
}
