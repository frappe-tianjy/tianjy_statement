import { InputLine, InputMap } from '../types.mts';

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
function getInputValue(
	value: object,
	values: Record<string, object>,
	field: string,
	subfield?: string,
	def?: any,
) {
	const val = (subfield ? values[field]?.[subfield] : value[field]) ?? null;
	if (val && typeof val === 'object') {
		if (Array.isArray(val)) { return null; }
		if (def === null) {
			val.label = '';
			val.value = '';
		}
		return val.value ?? '';
	}
	if (subfield) {
		const value = values[field];
		if (value) {
			value[subfield] = def;
		}
	} else {
		value[field] = def;
	}

	return def;
}

function getOldValue(
	modified: Record<string, any>,
	value: object,
	values: Record<string, object>,
	field: string,
	name: string,
	subfield?: string,
	subName?: string,
) {
	if (!(name in modified)) {
		return getValue(value, values, field, subfield) ?? null;
	}
	const doc = modified[name];
	if (!subfield || !subName) {
		if (field in doc){ return doc[field]; }
		return getValue(value, values, field, subfield) ?? null;
	}
	if (!(field in doc && typeof doc[field] === 'object')) {
		return getValue(value, values, field, subfield) ?? null;
	}
	const sub = doc[field];
	if (!(subName in sub)) {
		return getValue(value, values, field, subfield) ?? null;
	}
	const subDoc = sub[subName];
	if (!(subfield in subDoc)) {
		return getValue(value, values, field, subfield) ?? null;
	}
	return subDoc[subfield];
}
export function setModified(
	modified: Record<string, any>,
	data: any = null,
	line: InputLine,
	cell: InputMap,
	erase?: boolean,
): boolean {
	if (data && typeof data === 'object') { return false; }
	const { name, field, subname, subfield } = cell;
	const {value, values, originalValue, originalValues} = line;
	const newValue = getInputValue(value, values, field, subfield, data);
	const oldValue = erase
		? getValue(originalValue, originalValues, field, subfield) ?? null
		: getOldValue(modified, originalValue, originalValues, field, name, subfield, subname);
	if (
		newValue === oldValue ||
		(newValue === null ? '' : String(newValue)) === (oldValue === null ? '' : String(oldValue))
	) {
		if (!erase) { return false; }
		if (!(name in modified)) { return false; }
		const doc = modified[name];
		if (!subfield || !subname) {
			delete doc[field];
		} else {
			if (!(field in doc && typeof doc[field] === 'object')) { return false; }
			const sub = doc[field];
			if (!(subname in sub)) { return false; }
			delete sub[subname][subfield];
			if (!Object.getOwnPropertyNames(sub[subname]).length) { delete sub[subname]; }
			if (!Object.getOwnPropertyNames(sub).length) { delete doc[field]; }
		}
		if (!Object.getOwnPropertyNames(doc).length) { delete modified[name]; }
		return true;
	}
	if (!(name in modified)) {
		modified[name] = {};
	}
	const doc = modified[name];
	if (!subfield || !subname) {
		doc[field] = newValue;
		return true;
	}
	if (!(field in doc && typeof doc[field] === 'object')) {
		doc[field] = {};
	}
	const sub = doc[field];

	if (!(subname in sub)) {
		sub[subname] = {};
	}
	sub[subname][subfield] = newValue;
	return true;
}

export default function getSaveData(
	inputMap: (InputLine | undefined)[],
	data: any[][],
	transposition?: boolean,
) {
	const res = {};
	for (const [row, line] of inputMap.entries()) {
		if (!line) { continue; }
		for (const [col, cell] of line.cells.entries()) {
			if (!cell) { continue; }
			const [r, c] = transposition ? [col, row] : [row, col];
			setModified(res, data[r]?.[c], line, cell);
		}
	}
	if (!Object.keys(res).length) { return; }
	return res;
}
