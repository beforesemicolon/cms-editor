import {html} from '@beforesemicolon/markup';

const root = document.getElementById('app');

root && html`
	<h1>Welcome</h1>
`
	.render(root);
