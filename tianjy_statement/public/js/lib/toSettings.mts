import type { Template } from '../types.mjs';

export default function toSettings(value: Template) {
	const { data, merged, widths, heights } = value;
	return {
		data: data.map(v => [...v]),
		mergeCells: merged,
		colWidths: widths,
		rowHeights: heights,
	};
}
