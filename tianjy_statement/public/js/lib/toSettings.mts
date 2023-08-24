import type { Template } from '../types.mjs';

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


export default function toSettings(value: Template) {
	const { data, merged, widths, heights, styles, freezeRow, freezeCol } = value;
	return {
		data: data.map(v => [...v]),
		mergeCells: merged || [],
		colWidths: widths || [],
		rowHeights: heights || [],
		fixedRowsTop: freezeRow || 0,
		fixedColumnsStart: freezeCol || 0,
		cell: styles?.flatMap((v, row) => v.map((s, col) => s ? {
			row, col,
			bold: s.bold,
			italic: s.italic,
			underline: s.underline,
			color: s.color,
			bgColor: s.bgColor,
			className: getClassName(s),
		} : {row, col})) || [],
	};
}
