export async function createData(name: string, data: Record<string, any>) {
	return new Promise<any>((resolve, reject) => {
		// @ts-ignore
		frappe.call({
			method: 'tianjy_statement.statement.create',
			args: { name, data },
			callback(r) { resolve(r?.message); },
		}).fail(reject);
	});
}
