// @ts-check
/**
 * @typedef {object} Button
 * @property {string} label
 * @property {string} url
 * @property {Button[]?} [children]
 */

/**
 * @typedef {object} ButtonDefine
 * @property {string} label
 * @property {string} url
 * @property {number} [level]
 */
/**
 *
 * @param {Button[]} list
 * @returns {Button[]}
 */
function filter(list) {
	/** @type {Button[]} */
	const buttons = [];
	for (const b of list) {
		const children = filter(b.children || []);
		buttons.push({...b, children: children.length ? children : null});
	}
	return buttons;
}

/**
 *
 * @param {ButtonDefine[]} list
 * @returns
 */
function toButtonTree(list) {
	/** @type {Button[]} */
	const buttons = [];
	/** @type {Button[][]} */
	const patents = [];
	for (const {level, url, label} of list) {
		const l = level ? Math.min(patents.length, 1) : 0;
		patents.length = l;
		const list = l ? patents[l - 1] : buttons;
		const children = [];
		patents.push(children);
		list.push({label, url, children});
	}
	return filter(buttons);

}
/**
 *
 * @param {ButtonDefine[]} list
 * @returns
 */
export default function createButtonGroup(list) {
	const root = document.createElement('div');
	root.style.display = 'flex';
	root.style.alignItems = 'flex-start';
	for (const {url, label, children} of toButtonTree(list)) {
		if (!children) {
			const button = root.appendChild(document.createElement('button'));
			button.className = 'text-muted btn btn-default btn-sm';
			button.type ='button';
			button.style.marginInlineStart = '8px';
			const a = button.appendChild(document.createElement('a'));
			a.href = url;
			a.appendChild(document.createTextNode(label));
			continue;
		}
		// TODO: 分隔符：<li class="dropdown-divider user-action"></li>
		const group = root.appendChild(document.createElement('div'));
		group.className = 'menu-btn-group';
		const button = group.appendChild(document.createElement('button'));
		button.className = 'btn btn-default btn-sm';
		button.style.marginInlineStart = '8px';
		button.type ='button';
		button.dataset.toggle = 'dropdown';
		button.appendChild(document.createTextNode(label));

		const ul = group.appendChild(document.createElement('ul'));
		ul.className = 'dropdown-menu dropdown-menu-right';
		ul.role = 'menu';
		for (const {url, label} of children) {
			const li = ul.appendChild(document.createElement('li'));
			const a = li.appendChild(document.createElement('a'));
			a.href = url;
			a.className = 'grey-link dropdown-item';
			const span = a.appendChild(document.createElement('span'));
			span.className = 'menu-item-label';
			span.appendChild(document.createTextNode(label));

		}

	}
	return root;
}
