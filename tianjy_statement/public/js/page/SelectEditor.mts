import Handsontable from 'handsontable';


type Option = {value: string, label: string} | string;
function getOptions(options: Option[], required?: boolean): {value: string, label: string}[] {
	const list = options.map(v => {
		if (!v) { return {value: '', label: ''}; }
		if (typeof v === 'string') { return {value: v, label: __(v)}; }
		return {...v, label: __(v.label || v.value)};
	}).filter(v => {
		const val: any = v.value;
		return val || val === 0;
	});
	if (!required) {
		list.unshift({value: '', label: ''});
	}
	return list;

}
export default function createSelect(
	tianjyValue: {value: string, label: string},
	tianjyOptions: Option[],
	required?: boolean,
	loadOptions?: (v: string) => Option[] | void | Promise<Option[] | void>,
	noFilter?: boolean,
) {
	const titleValueMap = Object.create(null);
	let options = getOptions(tianjyOptions, required);
	function filterOptions(value: string) {
		if (loadOptions && !noFilter) { return options; }
		return options.filter(b => b.label.includes(value) || b.value.includes(value));

	}
	function updateTianjyValue(label: string) {
		if (tianjyValue.label === label) {
			return;
		}
		const option = options.find(v => v.label === label);
		if (option) {
			tianjyValue.value = option.value;
			tianjyValue.label = option.label;
			return;
		}
		if (!label) { return; }
		if (titleValueMap[label]) {
			tianjyValue.value = titleValueMap[label];
			tianjyValue.label = label;
		}
	}
	return class SelectEditor extends Handsontable.editors.BaseEditor {
		tianjyInput: HTMLInputElement;
		tianjyRoot: HTMLElement;
		tianjyUl: HTMLElement;
		setTianjyOptions() {
			const ul = this.tianjyUl;
			ul.innerHTML = '';
			for (const {value, label} of filterOptions(this.tianjyInput.value)) {
				const option = this.hot.rootDocument.createElement('li');
				option.innerText = label;
				ul.appendChild(option);
				option.addEventListener('click', () => {
					this.tianjyInput.value = label;
					tianjyValue.label = label;
					tianjyValue.value = value;
				});
			}
		}
		async loadTianjyOptions(t: string) {
			if (!loadOptions) { return; }
			const list = await loadOptions(t);
			if (!list) { return; }
			options = getOptions(list, required);
			this.setTianjyOptions();
		}
		/**
		 * Initializes editor instance, DOM Element and mount hooks.
		 */
		init() {
			// Create detached node, add CSS class and make sure its not visible
			const root = this.hot.rootDocument.createElement('div');
			const input = root.appendChild(this.hot.rootDocument.createElement('input'));
			this.tianjyInput = input;
			this.tianjyRoot = root;
			root.classList.add('tianjy-ht-select-editor');
			root.hidden = true;
			input.autocomplete = 'off';
			const query = frappe.utils.debounce(e=> { this.loadTianjyOptions(input.value); }, 500);

			const ul = root.appendChild(document.createElement('ul'));
			this.tianjyUl= ul;

			input.addEventListener('input', () => {
				if (loadOptions && !noFilter) {
					query();
				} else {
					this.setTianjyOptions();
				}
				updateTianjyValue(this.tianjyInput?.value || '');

			});
			input.addEventListener('focus', query);

			// Attach node to DOM, by appending it to the container holding the table
			this.hot.rootElement.appendChild(root);
		}
		// Create options in prepare() method
		prepare(row, col, prop, td, originalValue, cellProperties) {
			// Remember to invoke parent's method
			super.prepare(row, col, prop, td, originalValue, cellProperties);
			this.setTianjyOptions();
		}
		getValue() {
			return tianjyValue.label || '';
		}
		setValue(value) {
			const item = options.find(v => v.label === value);
			if (item) {
				tianjyValue.value = item.value;
				tianjyValue.label = item.label;
			} else if (value in titleValueMap) {
				tianjyValue.value = titleValueMap[value];
				tianjyValue.label = value;
			}
			this.tianjyInput.value = tianjyValue.label;
		}
		open() {
			const { top, start, width, height } = this.getEditedCellRect();
			const root = this.tianjyRoot;
			root.hidden = false;
			const selectStyle = root.style;

			selectStyle.height = `${height}px`;
			selectStyle.width = `${width}px`;
			selectStyle.top = `${top}px`;
			selectStyle[this.hot.isRtl() ? 'right' : 'left'] = `${start}px`;
		}

		focus() {
			this.tianjyInput.focus();
		}

		close() {
			this.tianjyRoot.hidden = true;
		}
	};
}
