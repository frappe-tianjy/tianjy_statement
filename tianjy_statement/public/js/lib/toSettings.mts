import type { BorderOptions, Template } from '../types.mjs';

import customStylesRenderer, { getRenderer } from './customStylesRenderer.mts';

function getClassName(s: Record<string, any>) {
	const className: string[] = [];
	if (s.left) {
		className.push('htLeft');
	} else if (s.center) {
		className.push('htCenter');
	} else if (s.right) {
		className.push('htRight');
	} else if (s.justify) {
		className.push('htJustify');
	}
	if (s.top) {
		className.push('htTop');
	} else if (s.middle) {
		className.push('htMiddle');
	} else if (s.bottom) {
		className.push('htBottom');
	}
	return className.join(' ');
}

function toSettingBorder(v?: BorderOptions) {
	if (!v) { return; }
	return {...v, width: 1 };
}

function getType(type?: string) {
	if (!type || !['text', 'numeric'].includes(type)) { return; }
	return {
		type,
		numericFormat: type === 'numeric' ? { pattern: '0,0.00' } : {},
		renderer: getRenderer(type),
		editor: type,
		dataType: type,
	};
}
export default function toSettings(value: Template) {
	const { data, merged, widths, heights, styles, freezeRow, freezeCol, borders } = value;
	return {
		data: data?.map(v => [...v]),
		mergeCells: merged || [],
		colWidths: widths || [],
		rowHeights: (heights || []).map(v => v || 'auto'),
		fixedRowsTop: freezeRow || 0,
		fixedColumnsStart: freezeCol || 0,
		customBorders: borders?.map(({
			row, col, left, right, top, bottom,
		}) => ({
			row, col,
			left: toSettingBorder(left),
			right: toSettingBorder(right),
			top: toSettingBorder(top),
			bottom: toSettingBorder(bottom),
		})) || [],
		cell: styles?.flatMap((v, row) => v?.map((s, col) => s ? {
			row, col,
			bold: s.bold,
			italic: s.italic,
			underline: s.underline,
			color: s.color,
			bgColor: s.bgColor,
			className: getClassName(s),
			fontSize: s.fontSize,
			type: '',
			numericFormat: {},
			dataType: '',
			renderer: customStylesRenderer,
			editor: 'text',
			...getType(s.type),
			readOnly: Boolean(s.readOnly),
		} : {row, col})).filter((Boolean)) || [],
	};
}
