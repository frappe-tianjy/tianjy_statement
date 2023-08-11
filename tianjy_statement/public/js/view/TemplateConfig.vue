<template>
	<ElFormItem label="数据开启止行">
		<ElInputNumber v-model="startRow" /> ~
		<ElInputNumber v-model="endRow" />
	</ElFormItem>
	<ElFormItem :class="$style.template">
		<div ref="root"></div>

	</ElFormItem>
</template>
<script lang="ts" setup>
import { computed, shallowRef, watch } from 'vue';
import Handsontable from 'handsontable';
import HyperFormula from 'hyperformula';
import { ElFormItem, ElInputNumber } from 'element-plus';

import readValue from '../lib/readValue.mjs';
import toSettings from '../lib/toSettings.mjs';
import { customStylesRenderer } from '../lib/customStylesRenderer.mjs';
import rendererStyleMenu from '../lib/rendererStyleMenu.mjs';

const root = shallowRef<HTMLElement>();


const props = defineProps<{
	meta: locals.DocType;
	name?: string;
	type: string;
	modelValue: any;
}>();

const emit = defineEmits<{
	(event: 'update:modelValue', value: any): void;
}>();


const cfg = computed({
	get: () => props.modelValue,
	set: v => emit('update:modelValue', v),
});
const startRow = computed({
	get: () => cfg.value?.start_row,
	set: start_row => { cfg.value = { ...cfg.value, start_row }; },
});
const endRow = computed({
	get: () => cfg.value?.end_row,
	set: end_row => { cfg.value = { ...cfg.value, end_row }; },
});


interface Named {
	type?: string;
	field: string;
	text?: string;
}
function getNamed(named: Named[]) {
	const v = named.map(v => ({ name: `${v.type || 'ctx'}.${v.field}`, expression: v.text }));
	return v;
}
let hat: Handsontable | undefined;

watch(root, async () => {
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
		contextMenu: {
			items: {
				row_above: {},
				row_below: {},
				hr0: '---------',
				col_left: {},
				col_right: {},
				hr1: '---------',
				remove_row: {},
				remove_col: {},
				hr2: '---------',
				undo: {},
				redo: {},
				hr3: '---------',
				make_read_only: {},
				hr4: '---------',
				alignment: {},
				hr5: '---------',
				copy: {},
				cut: {},
				hr6: '---------',
				mergeCells: {},
				hr7: '---------',
				style: {
					renderer() {
						return rendererStyleMenu(table);
					},
					disableSelection: false,
					isCommand: true,
				},
			},
		},
		manualColumnResize: true,
		manualRowResize: true,
		mergeCells: [],
		height: '100%',
		language: 'zh-CN',
		renderer: customStylesRenderer,
		licenseKey: 'non-commercial-and-evaluation',
		// @ts-ignore
		formulas: {
			engine: HyperFormula,
			// @ts-ignore
			namedExpressions: getNamed([
				...cfg.value.fields || [],
			]),
		},
	});
	const value = JSON.parse(cfg.value.template || 'null');
	if (value) {
		table.updateSettings(toSettings(value));
	}
	let timeout: any;
	const up = () => {
		clearTimeout(timeout);
		timeout = setTimeout(() => {
			cfg.value.template = JSON.stringify(readValue(table));
		}, 0);
	};
	table.updateSettings({
		afterMergeCells: up,
		afterUnmergeCells: up,
		afterColumnResize: up,
		afterRowResize: up,
		afterChange: up,
		afterSetCellMeta: up,
	});
	hat = table;
});

const tt = __;

</script>


<style module lang="less">
.template {
	height: calc(100% - 100px);

	:global .el-form-item__content {
		height: 100%;
	}

	:global .handsontable {
		width: 100%;
	}
}
</style>
