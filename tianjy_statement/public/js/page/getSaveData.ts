import { InputLine } from '../types.mts';

function getValue(
	value: object,
	values: Record<string, object>,
	field: string,
	subfield?: string,
) {
	const val = (subfield ? values[field]?.[subfield] : value[field]) ?? null;
	if (val === null) { return val; }
	if (typeof val !== 'object') { return val; }
	if (Array.isArray(val)) { return null; }
	return val.value;
}
export default function getSaveData(
	inputMap: (InputLine | undefined)[],
	data: any[][],
	transposition?: boolean,
) {
	const res = {};
	for (const [row, line] of inputMap.entries()) {
		if (!line) { continue; }
		const {value, values, originalValue, originalValues} = line;
		for (const [col, cell] of line.cells.entries()) {
			if (!cell) { continue; }
			const [r, c] = transposition ? [col, row] : [row, col];
			const text = data[r]?.[c] ?? null;
			if (typeof text === 'object') { continue; }
			const { name, field, subname, subfield } = cell;
			const newValue = getValue(value, values, field, subfield) ?? text;
			const oldValue = getValue(originalValue, originalValues, field, subfield) ?? null;
			if (newValue === oldValue) { continue; }
			const newText = newValue === null ? '' : String(newValue);
			const oldText = oldValue === null ? '' : String(oldValue);
			if (newText === oldText) { continue; }
			if (!(name in res)) {
				res[name] = {};
			}
			const doc = res[name];
			if (!subfield || !subname) {
				doc[field] = newValue;
				continue;
			}
			if (!(field in doc && typeof doc[field] === 'object')) {
				doc[field] = {};
			}
			const sub = doc[field];

			if (!(subname in sub)) {
				sub[subname] = {};
			}
			sub[subname][subfield] = newValue;
		}
	}
	if (!Object.keys(res).length) { return; }
	return res;

}
