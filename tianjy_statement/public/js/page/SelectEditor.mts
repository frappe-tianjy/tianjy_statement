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
	{required, loadOptions, noFilter, addValueListener}: {
		required?: boolean,
		loadOptions?: (v: string) => Option[] | void | Promise<Option[] | void>,
		noFilter?: boolean,
		addValueListener?(listener: (v: string) => Promise<string | null>): void;
	},
) {
	// Create detached node, add CSS class and make sure its not visible
	const root = document.createElement('div');
	const input = root.appendChild(document.createElement('input'));
	const ul = root.appendChild(document.createElement('ul'));
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

	function setTianjyOptions() {
		ul.innerHTML = '';
		for (const {value, label} of filterOptions(input.value)) {
			const option = document.createElement('li');
			option.innerText = label;
			titleValueMap[label] = value;
			ul.appendChild(option);
			option.addEventListener('click', () => {
				input.value = label;
				tianjyValue.label = label;
				tianjyValue.value = value;
			});
		}
	}
	async function loadTianjyOptions(t: string) {
		if (!loadOptions) { return false; }
		const list = await loadOptions(t);
		if (!list) { return false; }
		options = getOptions(list, required);
		setTianjyOptions();

		const {value} = input;
		const item = options.find(v => v.label === value);
		if (item) {
			tianjyValue.value = item.value;
			tianjyValue.label = item.label;
			return true;
		}
		if (value in titleValueMap) {
			tianjyValue.value = titleValueMap[value];
			tianjyValue.label = value;
			return true;
		}
	}


	root.classList.add('tianjy-ht-select-editor');
	root.hidden = true;
	input.autocomplete = 'off';
	const query = frappe.utils.debounce(()=> { loadTianjyOptions(input.value); }, 500);


	function setValue(value) {
		const item = options.find(v => v.label === value);
		if (item) {
			tianjyValue.value = item.value;
			tianjyValue.label = item.label;
			input.value = tianjyValue.label;
			return true;
		}
		if (value in titleValueMap) {
			tianjyValue.value = titleValueMap[value];
			tianjyValue.label = value;
			input.value = tianjyValue.label;
			return true;
		}
		input.value = value;
		return false;

	}
	addValueListener?.(async v => {
		if (!v) {
			tianjyValue.value = '';
			tianjyValue.label = '';
			input.value = '';
			return '';
		}
		if (setValue(v) || await loadTianjyOptions(v)) {
			return tianjyValue.label || '';
		}
		return null;
	});


	input.addEventListener('input', () => {
		if (loadOptions && !noFilter) {
			query();
		} else {
			setTianjyOptions();
		}
		updateTianjyValue(input.value || '');

	});
	input.addEventListener('focus', ()=> { loadTianjyOptions(input.value); });
	return class SelectEditor extends Handsontable.editors.BaseEditor {
		/**
		 * Initializes editor instance, DOM Element and mount hooks.
		 */
		init() { this.hot.rootElement.appendChild(root); }
		// Create options in prepare() method
		prepare(row, col, prop, td, originalValue, cellProperties) {
			// Remember to invoke parent's method
			super.prepare(row, col, prop, td, originalValue, cellProperties);
			setTianjyOptions();
		}
		getValue() { return tianjyValue.label || ''; }
		setValue(value) { setValue(value); }
		open() {
			const { top, start, width, height } = this.getEditedCellRect();
			root.hidden = false;
			const selectStyle = root.style;

			selectStyle.height = `${height}px`;
			selectStyle.width = `${width}px`;
			selectStyle.top = `${top}px`;
			selectStyle[this.hot.isRtl() ? 'right' : 'left'] = `${start}px`;
		}
		focus() { input.focus(); }
		close() { root.hidden = true; }
	};
}
