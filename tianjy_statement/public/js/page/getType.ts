import { InputLine, InputMap } from '../types.mts';

import createSelect from './SelectEditor.mts';
import { getFilters, parse as parseOptions} from './filter';


function getObjValue(line: InputLine, cell: InputMap) {
	const {value, values } = line;
	const { field, subfield } = cell;
	if (subfield) {
		const f = values[field];
		if (!f) { return; }
		const val = f[subfield] ?? null;
		if (val === null || val === '') {
			// eslint-disable-next-line no-return-assign
			return f[subfield] = {value: '', label: ''};

		}
		if (typeof val !== 'object') { return; }
		if (Array.isArray(val)) { return; }
		return val;
	}
	const val = value[field] ?? null;
	if (val === null || ['string', 'number', 'boolean', 'bigint'].includes(typeof val)) {
		const v = val ?? '';
		// eslint-disable-next-line no-return-assign
		return value[field] = {value: v, label: String(v)};
	}
	if (typeof val !== 'object') { return; }
	if (Array.isArray(val)) { return; }
	return val;
}


function merge_duplicates(results) {
	// in case of result like this
	// [{value: 'Manufacturer 1', 'description': 'mobile part 1'},
	// 	{value: 'Manufacturer 1', 'description': 'mobile part 2'}]
	// suggestion list has two items with same value (docname) & description
	return results.reduce((newArr, currElem) => {
		if (newArr.length === 0) { return [currElem]; }
		let element_with_same_value = newArr.find(e => e.value === currElem.value);
		if (element_with_same_value) {
			element_with_same_value.description += `, ${currElem.description}`;
			return [...newArr];
		}
		return [...newArr, currElem];
	}, []);
	// returns [{value: 'Manufacturer 1', 'description': 'mobile part 1, mobile part 2'}]
}
const noop = () => {};
function createValueListen(): [
	(listener: (v: string) => Promise<string | null>) => void,
	(v: string) => Promise<string | null>,
	] {
	let fn: (value: any) => any = noop;
	return [(f: any) => { fn = f; }, (value: any) => fn(value)];
}

export default function getType(fields: any, line?: InputLine | null, cell?: InputMap | null) {
	if (!line) { return; }
	if (!cell) { return; }
	const {value, values } = line;
	const { field, subfield } = cell;
	const val = (subfield ? values[field]?.[subfield] : value[field]) ?? null;

	const fn = subfield ? `${field}.${subfield}` : field;
	const df = fn in fields && fields[fn];
	if (!df) { return; }
	if (df.fieldtype === 'Select') {
		const val = getObjValue(line, cell);
		if (!val) { return; }
		const options = df.options?.split('\n').filter(Boolean);
		if (!options?.length) { return; }
		const [addValueListener, update] = createValueListen();
		cell.update = update;
		return createSelect(val, options, {required: df.reqd, addValueListener});
	}
	if (['Tree Select', 'Link', 'Tianjy Related Link'].includes(df.fieldtype)) {
		const val = getObjValue(line, cell);
		if (!val) { return; }
		const filterOptions = parseOptions(df.options);
		if (!filterOptions) { return; }
		const data = subfield ? values[field] : value;
		if (!(typeof data === 'object' && data)) { return; }
		/** @type {(f: string) => any} */
		const getFieldValue = typeof data === 'object' && data ? f => {
			const val = f in data ? data[f] ?? null : null;
			if (typeof val === 'object' && val) { return val.value; }
			return val;
		} : () => null;
		const {doctype, filters} = filterOptions;
		const [addValueListener, update] = createValueListen();
		cell.update = update;
		return createSelect(val, [{...val}], {required: df.reqd, loadOptions: async txt => {
			const {message, results = message} = await frappe.call({
				type: 'POST',
				method: 'frappe.desk.search.search_link',
				no_spinner: true,
				args: {
					txt,
					need_value: true,
					doctype,
					ignore_user_permissions: df.ignore_user_permissions,
					reference_doctype: df.parent || '',
					filters: getFilters(getFieldValue, filters),
				},
			});
			return merge_duplicates(results);
		}, addValueListener});
	}
	if (df.fieldtype === 'Dynamic Link') {
		const val = getObjValue(line, cell);
		if (!val) { return; }
		const field = df.options;
		if (!field) { return; }
		const data = subfield ? values[field] : value;
		if (!(typeof data === 'object' && data)) { return; }
		const [addValueListener, update] = createValueListen();
		cell.update = update;
		return createSelect(val, [{...val}], {required: df.reqd, loadOptions: async txt => {
			const val = field in data ? data[field] ?? null : null;
			const doctype = typeof val === 'object' && val ? val.value : val;
			if (!doctype) { return; }
			const {message, results = message} = await frappe.call({
				type: 'POST',
				method: 'frappe.desk.search.search_link',
				no_spinner: true,
				args: {
					txt, doctype,
					need_value: true,
					ignore_user_permissions: df.ignore_user_permissions,
					reference_doctype: df.parent || '',
				},
			});
			return merge_duplicates(results);
		}, addValueListener});
	}
	if (df.fieldtype === 'Tianjy Enumeration') {
		const val = getObjValue(line, cell);
		if (!val) { return; }
		const {options} = df;
		if (!options || typeof options !== 'string') { return; }
		const [enumType, enumFiled] = options.split(/\s*:\s*/, 2);
		if (!enumType) { return; }
		const data = subfield ? values[field] : value;
		if (!(typeof data === 'object' && data)) { return; }
		/** @type {(f: string) => any} */
		const getFieldValue = typeof data === 'object' && data ? f => {
			const val = f in data ? data[f] ?? null : null;
			if (typeof val === 'object' && val) { return val.value; }
			return val;
		} : () => null;
		const [addValueListener, update] = createValueListen();
		cell.update = update;
		return createSelect(val, [{...val}], {required: df.reqd, loadOptions:async txt => {
			let enumParent;
			if (enumFiled) {
				enumParent = getFieldValue(enumFiled);
				if (!enumParent) { return; }
			}
			const {message} = await frappe.call({
				type: 'POST',
				method: 'tianjy_enumeration.enumeration.options',
				no_spinner: true,
				args: { parent: enumParent, type: enumType },
			});
			return message;
		}, addValueListener, noFilter: true});

	}
	if (typeof val !== 'object') { return true; }
	if (Array.isArray(val)) { return; }
}
