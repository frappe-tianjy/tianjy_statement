import type { Template } from '../types.mjs';

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
						continue;
					}
				}
			}
			if (v && typeof v === 'object') { v = String(v); }
			if (['number', 'boolean', 'bigint'].includes(typeof v)) { return String(v); }
			if (typeof v === 'string') { return `"${v.replace(/"/g, '""')}"`; }
			return 0;
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
 * @param n
 * @returns
 */
function replaceCoord(
	s: number,
	e: number,
	length: number,
	start: number,
	end: number,
	n: number,
): [number, number] | undefined {
	if (s > end && e > end) {
		return [s + length * (n - 1), e + length * (n - 1)];
	}
	if (s <= start && e >= end) {
		if (!n) { return; }
		return [s, e + length * (n - 1)];
	}
}


/**
 * 替换数据区域单元格坐标
 */
function replaceDataCoord(
	s: number,
	e: number,
	k: number,
	length: number,
	start: number,
	end: number,
	n: number,
): [number, number] | undefined {
	if (s > end && e > end) {
		return [s + length * (n - 1), e + length * (n - 1)];
	}
	if (s >= start && e <= end) {
		return [s + length * k, e + length * k];
	}
	if (s < start && e > end) {
		if (!n) { return; }
		return [s, e + length * (n - 1)];
	}
}

function repeat<T>(rows: any[], list: T[], start: number, end: number) {
	const all = list.slice(start, end + 1);
	return [
		...list.slice(0, start),
		...[...rows].fill(all).flat(),
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
export default function render(
	{ data, merged, heights, styles, ...layout }: Template,
	dataArea: [number?, number?],
	ctx: any,
	rows: any[],
): Template {
	const start = ((dataArea[0] || 1) - 1) <= 0 ? 0 : (dataArea[0] || 1) - 1;
	const end = (dataArea[1] || 1) - 1 <= start ? start : (dataArea[1] || 1) - 1;
	const length = end - start + 1;
	const n = rows.length;
	function replaceData(value: string) {
		return replace(
			value,
			get.bind(null, { ctx }),
			(s, e) => replaceCoord(s, e, length, start, end, n),
		);
	}
	function replaceRowData(value: string, data: any, k: number) {
		return replace(
			value,
			get.bind(null, { ctx, data }),
			(s, e) => replaceDataCoord(s, e, k, length, start, end, n),
		);
	}
	const dataRows = data.slice(start, end + 1);
	return {
		...layout,
		heights: repeat(rows, heights || [], start, end),
		styles: repeat(rows, styles || [], start, end),
		merged: merged.flatMap(m => {
			const s = m.row;
			const e = m.row + m.rowspan;
			if (s >= start && e <= end) {
				return rows.map((_, index) => ({ ...m, row: m.row + length * index }));
			}
			if (s <= start && e >= end) {
				return { ...m, rowspan: m.rowspan + length * (rows.length - 1) };
			}
			if (s < end) { return m; }
			return { ...m, row: m.row + length * (rows.length - 1) };

		}),
		data: [
			...data.slice(0, start).map(l => l.map(v => replaceData(v))),
			...rows.flatMap((r, k) => dataRows.map(l => l.map(v => replaceRowData(v, r, k)))),
			...data.slice(end + 1).map(l => l.map(v => replaceData(v))),
		],
	};

}
