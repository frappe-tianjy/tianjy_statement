import type { Ref } from 'vue';
import { unref } from 'vue';

import type { Layout } from './types.mjs';

export default function toSettings(value: Layout | Ref<Layout>) {
	const { data, merged, widths, heights } = unref(value);
	return {
		data: data.map(v => [...v]),
		mergeCells: merged,
		colWidths: widths,
		rowHeights: heights,
	};
}
