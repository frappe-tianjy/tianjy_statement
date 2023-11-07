export default function toFieldArea(areas): [number, number, field: string][] {
	const fieldArea = areas?.map(v => {
		if (!v) { return; }
		const {field} = v;
		if (!field) { return; }
		const start = parseInt(v.start_col);
		const end = parseInt(v.end_col);
		if (!start || start < 0) { return; }
		if (!end || end < 0) { return; }
		return [start - 1, end - 1, field];
	}).filter(Boolean) || [];
	return fieldArea;
}
