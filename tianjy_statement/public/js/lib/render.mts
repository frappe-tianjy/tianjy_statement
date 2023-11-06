import type { Template, TemplateBorder } from '../types.mjs';

function replace(
	value: string,
	replaceName: (t: string) => any,
	replaceReference: (s: number, e: number) => [number, number] | undefined | null,
) {
	if (typeof value !== 'string' || value[0] !== '=') { return value; }

	// eslint-disable-next-line vue/max-len
	return value.replace(/"(?:[^"]|"")*"|(?<!:|\d)(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)(?![\dA-Z]|:)|([A-Z]+(?:\.[A-Z\d_]+)+)/ig, (_, r, n) => {
		if (n) {
			let v = replaceName(n);
			if (v && typeof v === 'object') {
				for (const k of ['_value', '_text', 'value', 'text']) {
					const r = v[k];
					if (['number', 'boolean', 'bigint', 'string'].includes(typeof r)) {
						v = r;
						break;
					}
				}
			}
			if (v && typeof v === 'object') { v = String(v); }
			if (['number', 'boolean', 'bigint'].includes(typeof v)) { return String(v); }
			if (typeof v === 'string') { return `"${v.replace(/"/g, '""')}"`; }
			return '""';
		}
		if (!r) { return _; }
		const t = /^(\$?[A-Z]+\$?)(\d+)(?::(\$?[A-Z]+\$?)(\d+))?$/i.exec(r);
		if (!t) { return _; }
		let b = Number(t[2]) - 1;
		let e = Number(t[4] || t[2]) - 1;
		const reversed = b > e;
		if (reversed) { [b, e] = [e, b]; }

		const v = replaceReference(b, e);
		if (!v) { return r; }
		if (v[0] === v[1] && !t[3]) {
			return `${t[1]}${v[0] + 1}`;
		}
		if (reversed) {
			return `${t[1]}${v[1] + 1}:${t[3] || t[1]}${v[0] + 1}`;
		}
		return `${t[1]}${v[0] + 1}:${t[3] || t[1]}${v[1] + 1}`;

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

function run(rows: any[], fieldArea: [number, number, field: string][]) {
	const rowData: [object, Set<number>][] = [];
	const group: number[] = [];
	for (const row of rows) {
		const lengths = fieldArea.map(([s, e, f]) => {
			const list = row[f];
			return [
				s, e, f, Array.isArray(list) ? list.length : 0,
			] as [number, number, field: string, number];
		});
		const max = lengths.reduce((v, l) => Math.max(v, l[3]), 1);
		group.push(max);
		for (let i = 0; i < max; i++) {
			const value = {...row};
			const mask: Set<number> = new Set();
			for (const [s, e, f, l] of lengths) {
				if (l > i) {
					value[f] = row[f][i];
					continue;
				}
				delete value[f];
				for (let i = s; i < e; i++) {
					mask.add(i);
				}
			}
			rowData.push([value, mask]);
		}
	}
	return {rowData, group};

}
export default function render(
	{ data, merged, heights, styles, borders, ...layout }: Template,
	dataArea: [number?, number?],
	global: any,
	rows: any[],
	fieldArea: [number, number, field: string][] = [],
	minRow = 0,
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
		);
	}
	function replaceRowData(value: string, data: any, k: number) {
		return replace(
			value,
			get.bind(null, { ...global, data }),
			(s, e) => replaceDataCoord(s, e, start, end, tailOffset, k * length),
		);
	}
	const dataRows = data.slice(start, end + 1);
	const colMax = dataRows.reduce((max, v) => Math.max(v.length, max), 1);
	const allMerged = merged.flatMap(m => {
		const s = m.row;
		const e = m.row + m.rowspan - 1;
		if (s >= start && e <= end) {
			if (s === start && e === end) { return []; }
			return Array(n).fill(0).map((_, index) => ({ ...m, row: m.row + length * index }));
		}
		if (s <= start && e >= end) {
			return { ...m, rowspan: m.rowspan + length * (n - 1) };
		}
		if (s < end) { return m; }
		return { ...m, row: m.row + length * (n - 1) };

	});
	if (start === end) {
		const area: {row: number, rowspan: number}[] = [];
		const lineArea: {row: number, rowspan: number}[] = [];
		let nextStart = start;
		for (const g of group) {
			(g > 1 ? area : lineArea).push({row: nextStart, rowspan: g});
			nextStart += g;
		}
		const mask = new Set<number>();
		for (const [s, e, f] of fieldArea) {
			for (let i = s; i <= e; i++) {
				mask.add(i);
			}
		}
		for (const m of merged) {
			const s = m.row;
			const e = s + m.rowspan - 1;
			if (s >= start && e <= end || s <= start && e >= end) {
				const s = m.col;
				const e = s + m.colspan - 1;
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
		for (let i = 0; i < colMax; i++) {
			if (mask.has(i)) { continue; }
			for (const a of area) {
				allMerged.push({col: i, colspan: 1, ...a});
			}
		}
	} else {
		for (const m of merged) {
			const s = m.row;
			const e = m.row + m.rowspan - 1;
			if (s === start && e === end) {
				for (let i = 0; i < n; i++) {
					allMerged.push({...m, row: m.row + length * i});
				}
			}
		}

	}
	return {
		...layout,
		heights: repeat(n, heights || [], start, end),
		styles: repeat(n, styles || [], start, end),
		borders: borders?.flatMap((v): TemplateBorder | TemplateBorder[] => {
			const {row} = v;
			if (row < start) { return v; }
			if (row > end) { return {...v, row: row + length * (n - 1)}; }
			return Array(n).fill(v).map((_, i) => ({...v, row: row + length * i}));
		}),
		merged: allMerged,
		data: [
			...data.slice(0, start).map(l => l.map(v => replaceData(v))),
			...rowData.flatMap(([r, mask], k) => dataRows.map(l => l.map((v, i) => mask.has(i) ? null : replaceRowData(v, r, k)))),
			...Array(addLength).fill(0).map(() => Array(colMax).fill(null)),
			...data.slice(end + 1).map(l => l.map(v => replaceData(v))),
		],
	};

}
