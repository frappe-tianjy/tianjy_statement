import defineMainView from 'guiguLib/defineMainView';

import type { Configuration } from '../types.mjs';

import View from './Main.vue';
import FieldsConfig from './FieldsConfig.vue';
import TemplateConfig from './TemplateConfig.vue';


defineMainView<Configuration>({
	type: 'Tianjy Statement View Configuration',
	label: 'Statement',

	nonpageable: true,
	scrollOnly: true,

	sider: [],
	toolbar: ['filterLine'],
	detail: true,
	view: View,
	rowAction: false,
	configuration: {
		filterField: true,
		widgets: [{
			component: FieldsConfig,
			label: '字段',
		}, {
			component: TemplateConfig,
			label: '模板',
		}],
	},
	pretreat: [],
	async getConfigurations(meta, {
		template,
		start_row,
		end_row,
		fields,
	}: {
		template?: string;
		start_row?: number;
		end_row?: number;
		fields?: { field: string }[];
	}): Promise<Configuration> {
		const data: Configuration = {
			template: JSON.parse(template || 'null'),
			startRow: start_row,
			endRow: end_row,
			fields: fields?.map(f => f.field) || [],
		};
		return data;
	},
	*fields(meta: locals.DocType, { fields }: Configuration) {
		yield* fields;
	},
});
