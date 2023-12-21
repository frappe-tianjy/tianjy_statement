import type { InputLine, Template, TemplateBorder } from '../types.mjs';


interface XlsxRange {
	startColFixed: boolean;
	startCol: number;
	startRowFixed: boolean;
	startRow: number;
	endColFixed: boolean;
	endCol: number;
	endRowFixed: boolean;
	endRow: number;
	many: boolean;

}
const ACode = 'A'.charCodeAt(0);
function parseCol(s: string) {
	let v = 0;
	for (let k = 1; k < s.length; k++) {
		v = (v + 1) * 26;
	}
	return v + [...s.toUpperCase()]
		.map(s => s.charCodeAt(0) - ACode)
		.reduce((v, s) => v * 26 + s, 0);
}

function toCol(n: number) {
	let v = 26;
	let i = 1;
	while (n >= v) {
		// eslint-disable-next-line no-param-reassign
		n -= v;
		i++;
		v *= 26;
	}
	let t: string[] = [];
	while (n > 0) {
		t.push(String.fromCharCode(n % 26 + ACode));
		// eslint-disable-next-line no-param-reassign
		n = Math.floor(n / 26);
	}
	if (t.length < i) {
		t = t.concat(Array(i - t.length).fill('A'));
	}
	return t.reverse().join('');
}

function parseRange(t: string): XlsxRange | undefined {
	const r = /^(\$?)([A-Z]+)(\$?)(\d+)(?::(\$?)([A-Z]+)(\$?)(\d+))?$/.exec(t);
	if (!r) { return; }
	const startColFixed = Boolean(r[1]);
	const startCol = parseCol(r[2]);
	const startRowFixed = Boolean(r[3]);
	const startRow = Number(t[4]) - 1;
	let many = false;
	let endColFixed = startColFixed;
	let endCol = startCol;
	let endRowFixed = startRowFixed;
	let endRow = startRow;
	if (r[6]) {
		endColFixed = Boolean(r[5]);
		endCol = parseCol(r[6]);
		endRowFixed = Boolean(r[7]);
		endRow = Number(r[8]) - 1;

	}
	return {
		startColFixed, startCol, startRowFixed, startRow,
		endColFixed, endCol, endRowFixed, endRow,
		many,
	};
}
function stringRange({
	startColFixed, startCol, startRowFixed, startRow,
	endColFixed, endCol, endRowFixed, endRow,
	many,
}: XlsxRange) {
	const t = [
		[
			startColFixed ? '$' : '',
			toCol(startCol),
			startRowFixed ? '$' : '',
			startRow + 1,
		].join(''),
	];
	if (many
		|| startColFixed !== endColFixed
		|| startCol !== endCol
		|| startRowFixed !== endRowFixed
		|| startRow !== endRow
	) {
		t.push([
			endColFixed ? '$' : '',
			toCol(endCol),
			endRowFixed ? '$' : '',
			endRow + 1,
		].join(''));
	}
	return t.join(':');
}
function transpose<T>(value: T[][]): T[][] {
	const inlineMax = value.reduce((max, v) => Math.max(v.length, max), 1);
	const result: T[][] = Array(inlineMax).fill(value.length).map(v => Array(v).fill(null));
	for (let i = 0; i < value.length; i++) {
		const line = value[i];
		for (let j = 0; j < line.length; j++) {
			result[j][i] = line[j];
		}
	}
	return result;
}
const nameCellRegex = /^=([A-Z]+(?:\.[A-Z\d_]+)+)$/i;
const rangeRegex = /^(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)$/i;
function getShowValue(v: any): string | boolean | bigint | string {
	if (v && typeof v === 'object') {
		for (const k of ['_value', '_text', 'label', 'value', 'text']) {
			const r = v[k];
			if (['number', 'boolean', 'bigint', 'string'].includes(typeof r)) {
				// eslint-disable-next-line no-param-reassign
				v = r;
				break;
			}
		}
	}
	if (v && typeof v === 'object') { return String(v); }
	if (['number', 'boolean', 'bigint', 'string'].includes(typeof v)) { return v; }
	return '';

}
function replace(
	value: string,
	replaceName: (t: string) => any,
	replaceReference: (s: number, e: number) => [number, number] | undefined | null,
	transposition = false,
) {
	if (typeof value !== 'string' || value[0] !== '=') { return value; }

	const path = nameCellRegex.exec(value)?.[1];
	if (path && !rangeRegex.test(path)) {
		const value = getShowValue(replaceName(path));
		if (typeof value !== 'string') { return value; }
		if (!value) { return value; }
		if (!'=!-+\''.includes(value[0])) { return value; }
		return `="${value.replace(/"/g, '""')}"`;
	}

	// eslint-disable-next-line vue/max-len
	return value.replace(/"(?:[^"]|"")*"|(?<!:|\d)(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)(?![\dA-Z]|:)|([A-Z]+(?:\.[A-Z\d_]+)+)/ig, (_, r, n) => {
		if (n) {
			const v = getShowValue(replaceName(n));
			return typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : String(v);
		}
		if (!r) { return _; }
		const tt = parseRange(r);
		if (!tt) { return _; }
		let [b, e] = transposition
			? [tt.startCol, tt.endCol]
			: [tt.startRow, tt.endRow];
		const reversed = b > e;
		if (reversed) { [b, e] = [e, b]; }
		const v = replaceReference(b, e);
		if (!v) { return r; }
		if (transposition) {
			if (reversed) {
				[tt.endCol, tt.startCol] = v;
			} else {
				[tt.startCol, tt.endCol] = v;
			}
		} else if (reversed) {
			[tt.endRow, tt.startRow] = v;
		} else {
			[tt.startRow, tt.endRow] = v;
		}
		return stringRange(tt);
	});
}

/**
 * 替换普通单元格坐标
 * @param a
 * @param length
 * @param start
 * @param end
 * @param tailOffset
 * @returns
 */
function replaceCoord(
	s: number,
	e: number,
	start: number,
	end: number,
	tailOffset: number,
): [number, number] | undefined {
	if (s > end && e > end) {
		return [s + tailOffset, e + tailOffset];
	}
	if (s <= start && e >= end) {
		return [s, e + tailOffset];
	}
}


/**
 * 替换数据区域单元格坐标
 */
function replaceDataCoord(
	s: number,
	e: number,
	start: number,
	end: number,
	tailOffset: number,
	lineOffset: number,
): [number, number] | undefined {
	if (s > end && e > end) {
		return [s + tailOffset, e + tailOffset];
	}
	if (s >= start && e <= end) {
		return [s + lineOffset, e + lineOffset];
	}
	if (s < start && e > end) {
		if (!tailOffset) { return; }
		return [s, e + tailOffset];
	}
}

function repeat<T>(n: number, list: T[], start: number, end: number) {
	const all = list.slice(start, end + 1);
	return [
		...list.slice(0, start),
		...Array(n).fill(all).flat(),
		...list.slice(end + 1),
	];
}


function get(value: any, keys: string) {
	let v = value;
	for (const k of keys.split('.')) {
		if (!v) { return; }
		v = v[k];
	}
	return v;

}

type RowData = {
	data: object;
	mask: Set<number>;
	value: object;
	values: Record<string, object>;
	originalValue: object;
	originalValues: Record<string, object>;
	index: Record<string, number>;
}

function run(rows: any[], fieldArea: [number, number, field: string][]) {
	const rowData: RowData[] = [];
	const group: number[] = [];
	for (const [index, originalValue] of rows.entries()) {
		const lengths = fieldArea.map(([s, e, f]) => {
			const list = originalValue[f];
			return [
				s, e, f, Array.isArray(list) ? list.length : 0,
			] as [number, number, field: string, number];
		});
		const max = lengths.reduce((v, l) => Math.max(v, l[3]), 1);
		group.push(max);
		const value = structuredClone(originalValue);
		for (let i = 0; i < max; i++) {
			const data = {...value};
			const mask: Set<number> = new Set();
			const originalValues = {};
			const values = {};
			for (const [s, e, f, l] of lengths) {
				if (l > i) {
					const subValue = value[f][i];
					data[f] = subValue;
					values[f] = subValue;
					originalValues[f] = originalValue[f][i];
					continue;
				}
				delete data[f];
				for (let i = s; i <= e; i++) {
					mask.add(i);
				}
			}
			rowData.push({
				index: {row: rowData.length + 1, data: index + 1, sub: i + 1},
				data,
				mask,
				value,
				values,
				originalValue,
				originalValues,
			});
		}
	}
	return {rowData, group};
}


function getInputFields(
	dataRows: any[][],
	fieldArea: [number, number, field: string][],
) {
	/** 数据行的行数 */
	const fieldMap: string[] = [];
	for (const [s, e, f] of fieldArea) {
		for (let i = s; i <= e; i++) {
			fieldMap[i] = f;
		}
	}
	const inputFields: (string | [string, string] | undefined)[][] = [];
	for (const [row, line] of dataRows.entries()) {
		const r: (string | [string, string] | undefined)[] = inputFields[row] = [];
		for (const [col, expr] of line.entries()) {
			if (typeof expr !== 'string' || expr[0] !== '=') { continue; }
			const path = nameCellRegex.exec(expr)?.[1];
			if (!path || rangeRegex.test(path)) { continue; }
			const paths = path.split('.').filter(Boolean);
			if (paths[0] !== 'data') { continue; }
			if (paths.includes('name')) { continue; }
			const field = fieldMap[col];
			if (!field) {
				if (paths.length !== 2) { continue; }
				const [, field] = paths;
				r[col] = field;
				continue;
			}
			if (paths.length !== 3 || paths[1] !== field) { continue; }
			const [,, subfield] = paths;
			r[col] = [field, subfield];
		}
	}
	return inputFields;

}


function getInputMap(
	dataRows: any[][],
	rowData: RowData[],
	start: number,
	end: number,
	fieldArea: [number, number, field: string][],
) {
	const inputFields = getInputFields(dataRows, fieldArea);
	/** 数据行的行数 */
	const length = end - start + 1;
	const fieldMap: string[] = [];
	for (const [s, e, f] of fieldArea) {
		for (let i = s; i <= e; i++) {
			fieldMap[i] = f;
		}
	}
	const inputMaps: InputLine[] = [];
	for (const [k, {
		data, mask, value, values, originalValue, originalValues,
	}] of rowData.entries()) {
		if (!('name' in data)) { continue; }
		const {name} = data as any;
		if (!name) { continue; }
		const begin = start + k * length;
		for (const [p, line] of inputFields.entries()) {
			const row = begin + p;
			const lineMap: InputLine = inputMaps[row] = {
				cells: [], value, values, originalValue, originalValues,
			};
			for (const [col, cellField] of line.entries()) {
				if (!cellField || mask.has(col)) { continue; }
				if (typeof cellField === 'string') {
					lineMap.cells[col] = {name, field: cellField, value: data[cellField]};
					continue;
				}
				const [field, subfield] = cellField;
				const subname = data[field]?.name;
				if (!subname) { continue; }
				lineMap.cells[col] = {
					name,
					field,
					subfield,
					subname,
					value: data[field]?.[subfield],
				};
			}
		}
	}
	return inputMaps;

}

export default function render(
	{ data, merged, heights, widths, styles, borders, ...layout }: Template,
	dataArea: [number?, number?],
	global: any,
	rows: any[],
	fieldArea: [number, number, field: string][] = [],
	transposition = false,
	minRow = 0,
	needInputMap?: boolean,
): Template {
	/** 开始行 */
	const start = ((dataArea[0] || 1) - 1) <= 0 ? 0 : (dataArea[0] || 1) - 1;
	/** 结束行 */
	const end = (dataArea[1] || 1) - 1 <= start ? start : (dataArea[1] || 1) - 1;
	/** 数据行的行数 */
	const length = end - start + 1;
	const {rowData, group} = run(rows, fieldArea);
	const n = Math.max(rowData.length * length, Math.floor(minRow) || 0);
	/** 在数据行之后，而外添加的行数 */
	const addLength = Math.max(0, n - rowData.length * length);
	const tailOffset = n - length;


	function replaceData(value: string) {
		return replace(
			value,
			get.bind(null, { ...global }),
			(s, e) => replaceCoord(s, e, start, end, tailOffset),
			transposition,
		);
	}
	function replaceRowData(value: string, data: any, k: number) {
		return replace(
			value,
			get.bind(null, { ...global, ...data }),
			(s, e) => replaceDataCoord(s, e, start, end, tailOffset, k * length),
			transposition,
		);
	}

	let newData = data;
	if (transposition) { newData = transpose(newData); }
	const dataRows = newData.slice(start, end + 1);
	const inlineMax = dataRows.reduce((max, v) => Math.max(v.length, max), 1);

	newData = [
		...newData.slice(0, start).map(l => l.map(v => replaceData(v))),
		...rowData.flatMap(({data, mask, index}, k) =>
			dataRows.map(l => l.map((v, i) => mask.has(i) ? null : replaceRowData(v, {
				data, index,
			}, k))),
		),
		...Array(addLength).fill(0).map(() => Array(inlineMax).fill(null)),
		...newData.slice(end + 1).map(l => l.map(v => replaceData(v))),
	];
	if (transposition) { newData = transpose(newData); }
	let blockStart: 'row' | 'col' = 'row';
	let blockSpan: 'rowspan' | 'colspan' = 'rowspan';
	let inlineStart: 'row' | 'col' = 'col';
	let inlineSpan: 'rowspan' | 'colspan' = 'colspan';
	if (transposition) {
		blockStart = 'col';
		blockSpan = 'colspan';
		inlineStart = 'row';
		inlineSpan = 'rowspan';
	}
	const allMerged = merged.flatMap(m => {
		const s = m[blockStart];
		const e = s + m[blockSpan] - 1;
		if (s === start && e === end) { return []; }
		if (s >= start && e <= end) {
			return Array(n).fill(0).map((_, index) => ({
				...m, [blockStart]: m[blockStart] + length * index,
			}));
		}
		if (s <= start && e >= end) {
			return { ...m, [blockSpan]: m[blockSpan] + length * (n - 1) };
		}
		if (s < end) { return m; }
		return { ...m, [blockStart]: m[blockStart] + length * (n - 1) };

	});
	if (start === end) {
		const area: object[] = [];
		const lineArea: object[] = [];
		let nextStart = start;
		for (const g of group) {
			(g > 1 ? area : lineArea).push({[blockStart]: nextStart, [blockSpan]: g});
			nextStart += g;
		}
		const mask = new Set<number>();
		for (const [s, e, f] of fieldArea) {
			for (let i = s; i <= e; i++) {
				mask.add(i);
			}
		}
		for (const m of merged) {
			const s = m[blockStart];
			const e = s + m[blockSpan] - 1;
			if (s >= start && e <= end || s <= start && e >= end) {
				const s = m[inlineStart];
				const e = s + m[inlineSpan] - 1;
				for (let i = s; i <= e; i++) {
					mask.add(i);
				}
			}
			if (s === start && e === end) {
				for (const a of lineArea) {
					allMerged.push({...m, ...a});
				}
				for (const a of area) {
					allMerged.push({...m, ...a});
				}
			}
		}
		for (let i = 0; i < inlineMax; i++) {
			if (mask.has(i)) { continue; }
			for (const a of area) {
				allMerged.push({col: i, colspan: 1, row: i, rowspan: 1, ...a});
			}
		}
	} else {
		for (const m of merged) {
			const s = m[blockStart];
			const e = s + m[blockSpan] - 1;
			if (s === start && e === end) {
				for (let i = 0; i < n; i++) {
					allMerged.push({...m, [blockStart]: m[blockStart] + length * i});
				}
			}
		}

	}

	let newStyles = styles || [];
	if (transposition) { newStyles = transpose(newStyles); }
	newStyles= repeat(n, newStyles || [], start, end);
	if (transposition) { newStyles = transpose(newStyles); }

	const inputMap = needInputMap ? getInputMap(
		dataRows,
		rowData,
		start,
		end,
		fieldArea,
	) : undefined;
	return {
		...layout,
		widths: transposition ? repeat(n, widths || [], start, end) : widths,
		heights:  transposition ? heights : repeat(n, heights || [], start, end),
		styles: repeat(n, styles || [], start, end),
		borders: borders?.flatMap((v): TemplateBorder | TemplateBorder[] => {
			const {[blockStart]:s} = v;
			if (s < start) { return v; }
			if (s > end) { return {...v, [blockStart]: s + length * (n - 1)}; }
			return Array(n).fill(v).map((_, i) => ({...v, [blockStart]: s + length * i}));
		}),
		merged: allMerged,
		data: newData,
		inputMap,
	};

}
