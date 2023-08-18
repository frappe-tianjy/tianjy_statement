import * as XLSX from 'xlsx-js-style';

import { Template, TemplateStyle } from '../types.mjs';
interface COLOR_SPEC {
	rgb: string;
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
	numFmt?: string | number;
	alignment?: {
		vertical?: 'bottom' | 'center' | 'top'
		horizontal?: 'left'|'center' |'right'
		/** 自动换行 */
		wrapText?: boolean;
		/** 文字方向 */
		readingOrder?: 0 | 1 | 2;
		/** 文本旋转角度 */
		textRotation?: 45 | 90 | 135 | 180 | 255;
	}
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
export default function exportXLSX(template: Template) {
	const {value} = template;
	const ws = XLSX.utils.aoa_to_sheet(
		value
			? template.data.map((v, r) => v.map((f, c) => {
				if (typeof f === 'string' && f[0] === '=') {
					return [value[r]?.[c] ?? null, f];
				}
				return f;
			}))
			: template.data,
	);
	ws['!cols'] = template.widths.map(wpx => ({wpx}));
	ws['!rows'] = template.heights.map(hpx => ({hpx}));
	ws['!merges'] = template.merged.map(({row, col, rowspan, colspan}) => ({
		s: {c: col, r: row},
		e: {c: col + colspan - 1, r: row + rowspan - 1},
	}));
	for (const [R, row] of template.styles?.entries() || []) {
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


	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Data');

	/* 保存至文件 */
	XLSX.writeFile(wb, 'Data.xlsx');

}
