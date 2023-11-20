const doctype = 'Tianjy Statement Configuration';

export function get_template(name: string) {
	return new Promise((resolve, reject) => {
		// @ts-ignore
		frappe.call({
			method: 'tianjy_statement.statement.get_template',
			type: 'GET',
			args: { doctype, name },
			callback: r => { resolve(r.message); },
		}).fail(reject);
	});
}
