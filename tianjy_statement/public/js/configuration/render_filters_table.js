export default function render_filters_table(frm) {
	const wrapper = $(frm.get_field('html_filters').wrapper).empty();
	const {doc_type} = frm.doc;
	frm.filter_html?.destroy?.();
	if (!doc_type) { return; }
	const filter = new frappe.ui.FilterGroup({
		parent: wrapper,
		doctype: doc_type,
		on_change: () => {
			const filters = JSON.stringify(filter.get_filters().filter(v => v[0] && v[1] && v[2]));
			if (filters === (frm.doc.filters || '[]')) { return; }
			frm.set_value('filters', filters);
		},
	});
	frm.filter_html = filter;
	try {
		filter.add_filters_to_filter_group(JSON.parse(frm.doc.filters || '[]').filter(v => v[0] && v[1]));
	} catch (e) {
		console.error(e);
	}
}
