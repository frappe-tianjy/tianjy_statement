<template lang="html">
	<div ref="root" :class="$style.root"></div>
	<slot name="pagination" />
</template>
<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';
import Handsontable from 'handsontable';
import HyperFormula from 'hyperformula';

import toSettings from '../lib/toSettings.mjs';
import render from '../lib/render.mjs';
import type { Configuration } from '../types.mjs';
import { customStylesRenderer } from '../lib/customStylesRenderer.mjs';


const root = shallowRef<HTMLElement>();
let hat: Handsontable | undefined;
const handsontable = computed(() => {
	if (hat) {
		hat.destroy();
		hat = undefined;
	}
	const el = root.value;
	if (!el) { return; }
	const table = new Handsontable(el, {
		startRows: 8,
		startCols: 6,
		rowHeaders: true,
		colHeaders: true,
		height: '100%',
		manualColumnResize: true,
		manualRowResize: true,
		language: 'zh-CN',
		renderer: customStylesRenderer,
		licenseKey: 'non-commercial-and-evaluation',
		formulas: { engine: HyperFormula },
		// cells: () => ({ readOnly: true }),
		// ...toSettings(render(template, dataArea, {}, rows)),
	});
	hat = table;
	return table;
});
const props = defineProps<{
	meta: locals.DocType;
	options: Record<string, any>;

	data: locals.Doctype[];
	total: number;
	loading?: boolean;

	modelValue: any;
	selected?: any[];

	infiniteScroll: boolean;
	page: number;
	limit: number;
	group: GlobalView.Group[];
	sort: GlobalView.MainLoaderOptions['order'];
	filters?: any;

	detail?: boolean;
	rowAction?: any;


	view: GlobalView.View;
	configuration: Configuration;
}>();
const emit = defineEmits<{
	(event: 'refresh'): void;
	(event: 'delete', name: string): void;
	(event: 'create', data: any, extend?: boolean): void;
	(event: 'nextPage'): void;
	(event: 'update:modelValue', value: any): void;
	(event: 'update:selected', value: any[]): void;
	(event: 'update:data', data: locals.Doctype[]): void;
	(event: 'filter', field: string, operator: string, value: any): void;
	(event: 'update:configuration', cfg: any): void;

}>();

watch([handsontable, () => props.configuration, () => props.data], ([
	t, { template, startRow, endRow }, d,
]) => {
	if (!t || !template) { return; }
	t.updateSettings(toSettings(render(template, [startRow, endRow], {}, d)));

});

</script>
<style module lang="less">
.main {
	height: 100%;
}
</style>
