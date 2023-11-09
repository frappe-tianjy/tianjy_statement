import type { DetailedSettings as MergeCellDetail } from 'handsontable/plugins/mergeCells';

export interface XLSXEditor {
	destroy(): void
	value: Template;
	name: string;
	formulasEnabled: boolean;
	readonly destroyed: boolean
	readValue(hasValue?: boolean): Template
	getData(): any[][];
	inputMode: boolean;
	namedExpressions: Record<string, string>;
}
export interface TemplateStyle {
	bold?: 1;
	italic?: 1;
	underline?: 1;
	color?: string;
	bgColor?: string;
	type?: 'text' | 'numeric';
	readOnly?: 1;

	fontSize?: number;


	left?: 1;
	center?: 1;
	right?: 1;
	justify?: 1;

	top?: 1;
	middle?: 1;
	bottom?: 1;
}
export interface BorderOptions {
	color: string;
}
export interface TemplateBorder {
	row: number;
	col: number;
	left?: BorderOptions;
	right?: BorderOptions;
	top?: BorderOptions;
	bottom?: BorderOptions;
}
export interface Template {
	data: any[][];
	value?: any[][];
	merged: MergeCellDetail[];
	/** 行高 */
	heights: (number | undefined)[];
	/** 列宽 */
	widths: (number | undefined)[];
	borders?: TemplateBorder[];
	/** TODO: 样式 */
	styles?: TemplateStyle[][];
	freezeRow?: number;
	freezeCol?: number;
	inputMap?: (InputMap | undefined)[][];
}

export interface Configuration {
	template?: Template | null;
	startRow?: number;
	endRow?: number;
	fields: string[];

}


export interface InputMap {
	name: string;
	field: string;
	value: any;
	subname?: string;
	subfield?: string;
}
