import Handsontable from 'handsontable';

export function parseSelectOptions(options?: string) {
	if (!options) { return; }

	const tianjyOptions: {value: string, label: string}[] = [];
	for (const o of options.split('\n').filter(Boolean)) {
		tianjyOptions.push({value: o, label: __(o)});
	}
	if (!tianjyOptions.length) { return; }
	tianjyOptions.unshift({value: '', label: ''});
	return tianjyOptions;

}
export function createSelect(
	tianjyValue: {value: string, label: string},
	tianjyOptions: {value: string, label: string}[],
) {
	const titleValueMap = {};
	return class SelectEditor extends Handsontable.editors.BaseEditor {
		select: HTMLSelectElement;
		/**
		 * Initializes editor instance, DOM Element and mount hooks.
		 */
		init() {
			// Create detached node, add CSS class and make sure its not visible
			const select = this.hot.rootDocument.createElement('select');
			this.select = select;
			select.classList.add('htSelectEditor');
			select.hidden = true;
			select.addEventListener('change', () => {
				const selectedOption = select.selectedOptions[0] ?? null;
				if (!selectedOption) { return; }
				tianjyValue.value = selectedOption.value;
				tianjyValue.label = selectedOption.text;

			});

			// Attach node to DOM, by appending it to the container holding the table
			this.hot.rootElement.appendChild(select);
		}
		// Create options in prepare() method
		prepare(row, col, prop, td, originalValue, cellProperties) {
			// Remember to invoke parent's method
			super.prepare(row, col, prop, td, originalValue, cellProperties);
			const {select} = this;
			select.innerText = '';
			for (const {value, label} of tianjyOptions) {
				const optionElement = this.hot.rootDocument.createElement('option');
				optionElement.value = value;
				optionElement.text = label;
				select.appendChild(optionElement);
			}
			select.value = tianjyValue.value;
		}
		getValue() {
			const {select} = this;
			return select.selectedOptions[0]?.text || select.value;
		}
		setValue(value) {
			const {select} = this;
			const item = [...select.options].find(v => v.text === value);
			if (item) {
				tianjyValue.value = item.value;
				tianjyValue.label = item.text;
			} else if (value in titleValueMap) {
				tianjyValue.value = titleValueMap[value];
				tianjyValue.label = value;
			}
			select.value = tianjyValue.value;
		}
		open() {
			const {
				top,
				start,
				width,
				height,
			} = this.getEditedCellRect();
			const {select} = this;
			select.hidden = false;
			const selectStyle = select.style;

			selectStyle.height = `${height}px`;
			selectStyle.width = `${width}px`;
			selectStyle.position = `absolute`;
			selectStyle.zIndex = `300`;
			selectStyle.top = `${top}px`;
			selectStyle[this.hot.isRtl() ? 'right' : 'left'] = `${start}px`;
			selectStyle.margin = '0px';
		}

		focus() {
			this.select.focus();
		}

		close() {
			this.select.hidden = true;
		}
	};
}
/**
.htSelectEditor {
-webkit-appearance: menulist-button !important;
position: absolute;
width: auto;
z-index: 300;
}
*/


// const container = document.querySelector('#container');
// const hot = new Handsontable(container, {
// 	columns: [
// 		{
// 			editor: SelectEditor,
// 			selectOptions: ['option1', 'option2', 'option3'],
// 		},
// 	],
// });
