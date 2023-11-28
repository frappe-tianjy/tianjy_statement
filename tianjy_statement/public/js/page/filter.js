// @ts-check
const eqRegex = /^([^\n~!@#$%^&*()<>?+{}[\]|\\:;"',=]+)([%]|#[^:#\n]+#)?(=|:|!:)(.*)$/;

/** @param {string} t */
function parseOp(t) {
	if (!t) { return '='; }
	const op = t[0] === '#' ? t.slice(1, -1) : t;
	if (op === '%') { return 'Like'; }
	return op;

}
/**
 * @typedef {object} FilterValue
 * @property {string} key
 * @property {string} op
 * @property {boolean} required
 * @property {string} [value]
 * @property {string} [field]
 */
/**
 * @typedef {object} Options
 * @property {string} doctype
 * @property {FilterValue[]} filters
 */
/**
 *
 * @param {string} options
 * @returns {Options?}
 */
export function parse(options) {
	if (!options || typeof options !== 'string') { return null; }
	const list = options.split('\n').filter(Boolean);
	const doctype = list.shift();
	if (!doctype) { return null; }
	/** @type {FilterValue[]} */
	const filters = [];
	for (const line of list) {
		const s = eqRegex.exec(line);
		if (!s) { continue; }
		const key = s[1].trim();
		const op = parseOp(s[2]);
		const required = s[3][0] === '!';
		const isField = s[3] !== '=';
		const value = s[4].trim();
		if (isField) {
			if (!value) { continue; }
			filters.push({ key, op, required, field: value });
			continue;
		}
		filters.push({ key, op, required, value });
	}
	return { doctype, filters };

}
/**
 *
 * @param {((f: string) => any) | Record<string, any>} data
 * @param {FilterValue[]?} [filterValues]
 * @returns
 */
export function getFilters(data, filterValues) {
	/** @type {(f: string) => any} */
	// eslint-disable-next-line no-nested-ternary
	const getFieldValue = typeof data === 'function' ? /** @type {(f: string) => any} */(data)
		:typeof data === 'object' && data ? f => f in data ? data[f] ?? null : null
			: () => null;
	const filters = [];
	for (const {key, value, required, op, field} of filterValues || []) {
		const val = field ? getFieldValue(field) : value;
		if (required && (val === null || val === '')){
			continue;
		}
		if (val === null && op === '=') {
			filters.push([key, 'is', 'not set']);
			continue;
		}
		if (val !== undefined) { filters.push([key, op, val]); }
	}
	if (!filters?.length) { return; }
	return filters;
}
