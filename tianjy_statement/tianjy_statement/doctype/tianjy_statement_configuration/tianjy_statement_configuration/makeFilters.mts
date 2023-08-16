export default function makeFilters(meta, parent, filters, update) {
	const doctype_fields = meta.fields;
	parent.classList.add('tianjy_statement_filters');
	const fields = new Map();

	for (let { options, fieldtype, fieldname, label } of doctype_fields) {
		if (!frappe.model.is_value_type(fieldtype)) { continue; }
		if (
			[
				'Text',
				'Small Text',
				'Text Editor',
				'HTML Editor',
				'Code',
				'JSON',
				'Read Only',
				'Dynamic Link',
				'Button',
				'HTML',
			].includes(fieldtype)
		) {
			continue;
		}
		if (fieldtype === 'Phone') {
			fieldtype = 'Data';
		} else if (fieldtype === 'Select') {
			const list = (options || '').split('\n').filter(Boolean);
			if (list.length) {
				list.unshift('');
				options = list.join('\n');
			} else {
				fieldtype = 'Data';
				options = '';
			}
		}

		fields.set(fieldname, { fieldtype, label: __(label), options, fieldname });
	}


	/** @type {Record<string, any>} */
	const fields_dict = {};
	const onchange = () => {
		const filters = {};
		for (const [key, field] of Object.entries(fields_dict)) {
			let value = field.get_value();
			if (!value) { continue; }
			filters[key] = value;
		}
		update(filters);
	};

	for (const { field } of filters) {
		const df = fields.get(field);
		if (!df) { continue; }
		fields.delete(field);
		const { fieldtype, label } = df;
		const f = frappe.ui.form.make_control({
			df: {
				...df,
				onchange,
				is_filter: 1,
				placeholder: label,
				condition: '=',
				input_class: 'input-xs',
			}, parent, only_input: fieldtype === 'Check' ? false : true,
		});
		f.refresh();
		fields_dict[field] = f;
		$(f.wrapper).addClass('col-md-2').attr('title', label)
			.tooltip({
				delay: { show: 600, hide: 100 },
				trigger: 'hover',
			});


		// hidden fields dont have $input
		if (!f.$input) { f.make_input(); }

		f.$input.attr('placeholder', label);

		if (fieldtype === 'Check') {
			$(f.wrapper).find(':first-child').removeClass('col-md-offset-4 col-md-8');
		}


	}

	console.log(fields_dict);
	return fields_dict;
}
