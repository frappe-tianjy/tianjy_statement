<template>
	<ElFormItem>
		<ElTable :data="fields" style="width: 100%">
			<ElTableColumn :label="t('字段')" #="{ row, $index }">
				<ElSelect
					filterable defaultFirstOption :modelValue="row.field || ''"
					@update:modelValue="set($index, 'field', $event)">
					<template v-for="item in allOptions" :key="item.field">
						<ElOption
							v-if="row.field === item.field || !added.has(`${item.field}`)"
							:key="item.field"
							:value="item.field"
							:label="tt(item.label)">
						</ElOption>
					</template>
				</ElSelect>
			</ElTableColumn>
			<ElTableColumn :label="t('参考值')" #="{ row, $index }">
				<ElInput :modelValue="row.text || ''"
					@update:modelValue="set($index, 'text', $event)" />
			</ElTableColumn>
			<ElTableColumn :label="t('名称')" #="{ row }">
				<span v-if="row">data.{{ row.field }}</span>
				<span v-else></span>
			</ElTableColumn>

			<ElTableColumn :label="t('操作')" #="{ $index }">
				<ElButton type="danger" @click="remove($index)" text
					:icon="Delete" :title="t('删除')" />
			</ElTableColumn>
		</ElTable>
		<ElButton @click="add">{{ t('新增') }}</ElButton>

	</ElFormItem>
</template>
<script setup lang="ts">
import { computed, ref, h } from 'vue';
import { useI18n } from 'vue-i18n';
import {
	ElTable, ElTableColumn,
	ElSelect, ElInput,
	ElFormItem, ElButton, ElMessageBox, ElOption,
} from 'element-plus';
import { Delete } from '@element-plus/icons-vue';
const tt = __;
const props = defineProps<{
	meta: locals.DocType;
	modelValue: any;
}>();
const emit = defineEmits<{
	(event: 'update:modelValue', value: GlobalView.View): void;
}>();
const view = computed({
	get: () => props.modelValue,
	set: v => emit('update:modelValue', v),
});
const { t } = useI18n({});

const fields = computed<any[]>({
	get: () => view.value.fields || [],
	set: v => { view.value = { ...view.value, fields: v }; },
});
function set(index: number, key: string, value: any) {
	const list = [...fields.value];
	const item: any = list[index];
	if (!item) { return; }
	item[key] = value;
	fields.value = list;
}

const added = computed(() => new Set(
	fields.value.map(f => `${f.field}`),
));
const groupFieldTypes = new Set([
	'select',
	'check',
	'date',
	'datetime',
	'time',

	'small text',
	'text',
	'code',
	'color',
	'data',
	'currency',
	'float',
	'int',
	'link',
	'long text',
	'percent',
	'rating',
]);
const allOptions = computed(() => {
	const { meta } = props;
	const doctype = meta.name;
	const list: { label: any; field: string; }[] = [];
	function add_field_option({ fieldname: field, label, fieldtype: type, permlevel }: any) {
		if (!groupFieldTypes.has(type.toLowerCase())) { return; }
		if (!frappe.perm.has_perm(doctype, permlevel, 'read')) { return; }
		if (field === 'docstatus' && !frappe.model.is_submittable(doctype)) { return; }
		if (!frappe.model.is_value_type(type)) { return; }
		list.push({ field, label: __(label || field) });
	}
	for (const df of frappe.model.std_fields) {
		add_field_option(df);
	}
	if (meta.istable) {
		add_field_option({ fieldname: 'parent', fieldtype: 'Data', label: 'Parent' });
	}
	for (const df of meta.fields) {
		add_field_option(df);
	}
	const seen = new Set(['_user_tags', '_liked_by', '_comments']);
	return list.filter(({ field }) => {
		if (seen.has(field)) { return false; }
		seen.add(field);
		return true;
	});
});
const optionsAddible = computed(() => {
	const addedList = added.value;
	return allOptions.value.filter(({ field }) => !addedList.has(field));
});

function add() {
	fields.value = [...fields.value, { type: 'data' }];
}
function remove(index: number) {
	const list = [...fields.value];
	if (!list.splice(index, 1).length) { return; }
	fields.value = list;
}

</script>
<i18n lang="yaml" locale="zh">
名称: 名称
字段: 字段
参考值: 参考值
操作: 操作
删除: 删除
新增: 新增
</i18n>
