export async function saveData(name: string, data: Record<string, any>) {
	return new Promise<any>((resolve, reject) => {
		// @ts-ignore
		frappe.call({
			method: 'tianjy_statement.statement.save_data',
			args: { name, data },
			callback(r) { resolve(r?.message); },
		}).fail(reject);
	});
}
