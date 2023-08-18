import type Handsontable from 'handsontable';

function setCells(
	table: Handsontable.Core,
	key: string,
	value: any,
) {
	for (const { from, to } of table.getSelectedRange() || []) {
		const rStart = Math.min(from.row, to.row);
		const rEnd = Math.max(from.row, to.row);
		const cStart = Math.min(from.col, to.col);
		const cEnd = Math.max(from.col, to.col);
		for (let x = cStart; x <= cEnd; x++) {
			for (let y = rStart; y <= rEnd; y++) {
				table.setCellMeta(y, x, key, value);
			}
		}
	}
	table.render();
	table.getPlugin('contextMenu')?.close();

}

function createBoolStyle(title: string, enabled: boolean, cb: (v: boolean) => void) {
	const label = document.createElement('label');
	const input = label.appendChild(document.createElement('input'));
	input.type = 'checkbox';
	if (enabled) { input.setAttribute('checked', ''); }
	input.addEventListener('change', () => { cb(input.checked); });
	label.appendChild(document.createTextNode(title));
	label.addEventListener('mouseup', e => { e.stopPropagation(); });
	return label;
}
function createColorStyle(title: string, color: string | undefined, cb: (v: string) => void) {
	const div = document.createElement('div');
	div.appendChild(document.createTextNode(title));
	const input = div.appendChild(document.createElement('input'));
	input.type = 'color';
	if (color) { input.setAttribute('value', color); }
	input.addEventListener('change', () => { cb(input.value); });
	input.addEventListener('mouseup', e => { e.stopPropagation(); });
	return div;
}

export default function rendererStyleMenu(table: Handsontable.Core) {
	const a = table.getSelectedRange()?.[0]?.from;
	const meta: Record<string, any> = a
		&& table.getCellMeta(Math.max(0, a.row), Math.max(0, a.col))
		|| {};
	const el = document.createElement('div');

	const div = el.appendChild(document.createElement('div'));

	div.appendChild(createBoolStyle('粗体', meta.bold, v => setCells(table, 'bold', v)));
	div.appendChild(createBoolStyle('斜体', meta.italic, v => setCells(table, 'italic', v)));
	div.appendChild(createBoolStyle('下划线', meta.underline, v => setCells(table, 'underline', v)));
	el.appendChild(createColorStyle('文本颜色', meta.color, v => setCells(table, 'color', v)));
	el.appendChild(createColorStyle('文本颜色', meta.bgColor, v => setCells(table, 'bgColor', v)));

	return el;
}
