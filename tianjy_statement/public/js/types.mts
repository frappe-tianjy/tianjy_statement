import type { DetailedSettings as MergeCellDetail } from 'handsontable/plugins/mergeCells';


export interface Template {
	data: any[][];
	merged: MergeCellDetail[];
	/** 行高 */
	heights: (number | undefined)[];
	/** 列宽 */
	widths: (number | undefined)[];
	/** TODO: 样式 */
	// cellStyles?: any;
}

export interface Configuration {
	template?: Template | null;
	startRow?: number;
	endRow?: number;
	fields: string[];

}
