import type { DetailedSettings as MergeCellDetail } from 'handsontable/plugins/mergeCells';


export interface Layout {
	data: any[][];
	merged: MergeCellDetail[];
	/** TODO: 样式 */
	// cellStyles?: any;
	/** TODO: 行高 */
	heights: (number | undefined)[];
	/** TODO: 列宽 */
	widths: (number | undefined)[];
}
