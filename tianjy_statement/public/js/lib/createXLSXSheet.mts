import * as XLSX from 'xlsx-js-style';

import type { BorderOptions, Template, TemplateStyle } from '../types.mjs';
interface COLOR_SPEC {
	rgb: string;
}
interface XLSXBorder {
	style: 'thin' | 'medium' | 'thick'
	// 下面的类型目前暂不支持
	|'dashDotDot' | 'mediumDashDotDot'
	|'dashDot' | 'mediumDashDot' | 'slantDashDot'
	| 'dashed' | 'mediumDashed'
	| 'dotted' | 'hair';
	color: COLOR_SPEC;
}
interface XLSXStyle {
	fill?: {
		/** 图案样式 */
		patternType?: any;
		/** 图案样式颜色 */
		bgColor?: COLOR_SPEC;
		/** 填充颜色 */
		fgColor?: COLOR_SPEC;
	},
	font?: {
		/** 字体名称 */
		name?: string;
		/** 字号 */
		sz?: number;
		color?: COLOR_SPEC;
		bold?: boolean;
		underline?: boolean;
		italic?: boolean;
		strike?: boolean;
		/** 上下标 */
		vertAlign?: 'superscript' | 'subscript'
	},
	/** 对数字类型的单元格进行格式化 */
	numFmt?: string;
	alignment?: {
		vertical?: 'bottom' | 'center' | 'top'
		horizontal?: 'left'|'center' |'right'
		/** 自动换行 */
		wrapText?: boolean;
		/** 文字方向 */
		readingOrder?: 0 | 1 | 2;
		/** 文本旋转角度 */
		textRotation?: 45 | 90 | 135 | 180 | 255;
	},
	border?: {
		top?: XLSXBorder;
		bottom?: XLSXBorder;
		left?: XLSXBorder;
		right?: XLSXBorder;
	},
}

function getFillStyle(style: TemplateStyle, fill : XLSXStyle['fill'] = {}) {
	let has = false;
	if (style.bgColor) {
		has = true;
		fill.fgColor = {rgb: style.bgColor.slice(1)};
	}
	if (has) { return fill; }

}
function getStyleFont(style: TemplateStyle, font: XLSXStyle['font'] = {}) {
	let has = false;
	if (style.color) {
		has = true;
		font.color = {rgb: style.color.slice(1)};
	}
	if (style.bold) {
		has = true;
		font.bold = true;
	}
	if (style.underline) {
		has = true;
		font.underline = true;
	}
	if (style.italic) {
		has = true;
		font.italic = true;
	}
	if (has) { return font; }
}
function getStyleAlignment(style: TemplateStyle, alignment: XLSXStyle['alignment'] = {}) {
	if (style.left) {
		alignment.horizontal = 'left';
	} else if (style.center) {
		alignment.horizontal = 'center';
	} else if (style.right) {
		alignment.horizontal = 'right';
	}
	if (style.top) {
		alignment.vertical = 'top';
	} else if (style.middle) {
		alignment.vertical = 'center';
	} else if (style.bottom) {
		alignment.vertical = 'bottom';
	} else {
		alignment.vertical = 'top';
	}
	return alignment;

}
function getStyle(style: TemplateStyle, s: XLSXStyle = {}) {
	const font = getStyleFont(style, s.font || {});
	if (font) {
		s.font = font;
	}
	const fill = getFillStyle(style, s.fill || {});
	if (fill) {
		s.fill = fill;
	}
	s.alignment = getStyleAlignment(style, s.alignment || {});
	return s;

}

function toXLSXBorder({color}: BorderOptions): XLSXBorder {
	return {color: {rgb: color}, style: 'thin'};
}
export default function createXLSXSheet(template: Template) {
	const {value, data, widths, heights, merged, styles, freezeCol, freezeRow, borders} = template;
	const ws = XLSX.utils.aoa_to_sheet(
		value
			? data.map((v, r) => v.map((f, c) => {
				if (typeof f === 'string' && f[0] === '=') {
					return [value[r]?.[c] ?? null, f];
				}
				return f;
			}))
			: data,
	);
	ws['!cols'] = widths.map(wpx => ({wpx}));
	ws['!rows'] = heights.map(hpx => ({hpx}));
	ws['!merges'] = merged.map(({row, col, rowspan, colspan}) => ({
		s: {c: col, r: row},
		e: {c: col + colspan - 1, r: row + rowspan - 1},
	}));
	if (freezeCol && freezeRow) {
		const ref = XLSX.utils.encode_cell({c: freezeCol, r: freezeRow});
		ws['!freeze'] = ref;
	}
	for (const [R, row] of styles?.entries() || []) {
		for (const [C, style] of row?.entries() || []) {
			if (!style) { continue; }
			const ref = XLSX.utils.encode_cell({ c: C, r: R });
			const cell: XLSX.CellObject | undefined = ws[ref];
			const s = getStyle(style, cell?.s || {});
			if (cell) {
				cell.s = s;
			} else {
				ws[ref] = {s, v: '', t: 's'};
			}
		}
	}
	for (const {row, col, left, right, top, bottom} of borders || []) {
		const ref = XLSX.utils.encode_cell({ c: col, r: row });
		let cell: XLSX.CellObject | undefined = ws[ref];
		if (!cell) { ws[ref] = cell = {v: '', t: 's'}; }
		let style: XLSXStyle | undefined = cell.s;
		if (!style) { cell.s = style = {}; }
		let {border} = style;
		if (!border) { style.border = border = {}; }
		if (left) { border.left = toXLSXBorder(left); }
		if (right) { border.right = toXLSXBorder(right); }
		if (top) { border.top = toXLSXBorder(top); }
		if (bottom) { border.bottom = toXLSXBorder(bottom); }

	}
	return ws;

}
