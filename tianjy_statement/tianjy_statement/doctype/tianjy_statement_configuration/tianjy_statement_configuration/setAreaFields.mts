export default async function setAreaFields(frm: frappe.ui.form.Form) {
	// get the doctype to update fields
	const doc = frm.doc as any;
	if (!doc.doc_type) { return; }
	const fieldValues = new Set(doc.fields?.map(v => v.field || '')
		.filter(v => v.includes('.')).map(v => v.split('.')[0]) || []);
	const fields = frappe.get_meta(doc.doc_type)?.fields
		.filter(d => d.fieldtype === 'Table' && fieldValues.has(d.fieldname))
		.map(d => ({
			value: d.fieldname,
			label: `${__(d.label || d.fieldname)} (${d.fieldname})`,
		}));

	frm.fields_dict.areas.grid.update_docfield_property('field', 'options', fields);
}
