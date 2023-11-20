export async function getData(name: string, ctx: Record<string, any>) {
	return new Promise<any>((resolve, reject) => {
		// @ts-ignore
		frappe.call({
			method: 'tianjy_statement.statement.get_data',
			args: { name, ctx },
			callback(r) { resolve(r?.message || { list: [], ctx }); },
		}).fail(reject);
	});
}
