<template>
	<ElFormItem label="数据启止行">
		<ElInputNumber v-model="startRow" /> ~
		<ElInputNumber v-model="endRow" />
	</ElFormItem>
	<ElFormItem label="固定行列数（仅渲染时有效）">
		行：
		<ElInputNumber v-model="fixedRow" />
		列：
		<ElInputNumber v-model="fixedCol" />
	</ElFormItem>
	<ElFormItem :class="$style.template">
		<div ref="root"></div>
	</ElFormItem>
</template>
<script lang="ts" setup>
import { computed, shallowRef, watch, ref } from 'vue';
import Handsontable from 'handsontable';
import { ElFormItem, ElInputNumber } from 'element-plus';

import toSettings from '../lib/toSettings.mjs';
import createEditor from '../lib/createEditor.mjs';

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
const template = shallowRef(JSON.parse(cfg.value.template || 'null'));
watch(template, (t: any) => {
	cfg.value.template = JSON.stringify(t);
});
const fixedRow = computed({
	get: () => template.value?.fixedRow || 0,
	set: fixedRow => { template.value = { ...template.value, fixedRow }; },
});

const fixedCol = computed({
	get: () => template.value?.fixedCol || 0,
	set: fixedCol => { template.value = { ...template.value, fixedCol }; },
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
	const table = createEditor(el, '100%', getNamed([...cfg.value.fields || []]), v => {
		template.value = { ...template.value, ...v };
	});
	const { value } = template;
	if (value) {
		table.updateSettings(toSettings(value));
	}
	hat = table;
});

const tt = __;

</script>


<style module lang="less">
.template {
	height: calc(100% - 200px);

	:global .el-form-item__content {
		height: 100%;
	}

	:global .handsontable {
		width: 100%;
	}
}
</style>
