<template lang="html">
	<div ref="root" :class="$style.root"></div>
	<slot name="pagination" />
</template>
<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';

import render from '../lib/render.mjs';
import type { Configuration } from '../types.mjs';
import create from '../lib/create.mjs';

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


const root = shallowRef<HTMLElement>();
const handsontable = computed(() => {
	const el = root.value;
	if (!el) { return; }
	const table = create(el, {height: '100%'});
	return table;
});
watch(handsontable, (_, editor) => { editor?.destroy(); });

watch([handsontable, () => props.configuration, () => props.data], ([
	editor, { template, startRow, endRow }, d,
]) => {
	if (!editor || !template) { return; }
	editor.value = render(template, [startRow, endRow], {ctx: {}}, d);
});

</script>
<style module lang="less">
.main {
	height: 100%;
}
</style>
