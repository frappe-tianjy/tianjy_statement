import type { DetailedSettings as MergeCellDetail } from 'handsontable/plugins/mergeCells';

export interface XLSXEditor {
	destroy(): void
	value: Template;
	formulasEnabled: boolean;
	readonly destroyed: boolean
	readValue(hasValue?: boolean): Template
	namedExpressions: { name: string; expression: string | undefined; }[];
}
export interface TemplateStyle {
	bold?: 1;
	italic?: 1;
	underline?: 1;
	color?: string;
	bgColor?: string;


	left?: 1;
	center?: 1;
	right?: 1;
	justify?: 1;

	top?: 1;
	middle?: 1;
	bottom?: 1;
}
export interface Template {
	data: any[][];
	value?: any[][];
	merged: MergeCellDetail[];
	/** 行高 */
	heights: (number | undefined)[];
	/** 列宽 */
	widths: (number | undefined)[];
	/** TODO: 样式 */
	styles?: TemplateStyle[][];
	freezeRow?: number;
	freezeCol?: number;
}

export interface Configuration {
	template?: Template | null;
	startRow?: number;
	endRow?: number;
	fields: string[];

}
