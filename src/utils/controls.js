const {html} = BFS.MARKUP;

export const controls = (def, onchange) => {
  const handleValueChange = event => onchange(event.target.value);
  let field =  null;
  
  switch (def.type) {
    case 'text':
    case 'number':
    case 'email':
    case 'password':
    case 'url':
    case 'tel':
    case 'color':
    case 'date':
    case 'datetime-local':
    case 'month':
    case 'time':
    case 'week':
      field = html`<input type="${def.type}" value="${def.value}" onchange="${handleValueChange}"/>`;
      break;
    case 'message':
      field = html`<textarea rows="5" onchange="${handleValueChange}">${def.value}</textarea>`;
      break;
    case 'boolean':
      field = html`<input type="checkbox" checked="${def.value}" onchange="${handleValueChange}"/>`;
      break;
    case 'options':
      field = html`
        <select onchange="${handleValueChange}">
          ${def.options.map(option => html`<option value="${option.value}" selected="${option.value === def.value}">${option.label}</option>`)}
        </select>
      `;
      break;
    default:
      return null;
  }
  
  const label = def.label || def.name;
  
  return html`
		<label aria-label="${label}" class="${def.type}-field">
			<span class="field-label">${label}:</span>
			${field}
      ${def.description ? html`<p class="field-description">${def.description}</p>` : ``}
		</label>
  `;
}
