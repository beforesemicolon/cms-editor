import {parseTemplate} from "./utils/parse-template.js";
import {controls} from "./utils/controls.js";
import {mergeObjects} from "./utils/merge-objects.js";
import {auth0Client} from './auth.js';

const {html, state, effect, when, is, oneOf, repeat, or, pick} = BFS.MARKUP;

const searchParams = new URLSearchParams(location.search);
const pagesCache = new Map();
const widgetsCache = new Map();
const renderNodes = new Map();

const [page, setPage] = state(searchParams.get('page') || 'home');
const [user, setUser] = state(null);
const [templateStatus, setTemplateStatus] = state('idle');
const [pendingChanges, updatePendingChanges] = state(0);
const [template, setTemplate] = state(null);
const [templateContent, setTemplateContent] = state('');
const [currentWidgetId, setCurrentWidgetId] = state('');
const [currentWidget, setCurrentWidget] = state(null);
const [currentWidgetStatus, setCurrentWidgetStatus] = state('idle');
const [publishStatus, setPublishStatus] = state('publish');
const [saveStatus, setSaveStatus] = state('save');

let currentWidgetRenderId = '';

// load page template
effect(() => {
	if (pagesCache.has(page())) {
		setTemplate(pagesCache.get(page()));
	} else {
		setTemplateStatus('loading');
		
		Promise.all([
			auth0Client.getUser(),
			fetch(`./src/templates/${page()}.json`).then(res => res.json())
		])
			.then(async ([user, res]) => {
				setUser(user);
				if (res.extends) {
					const base = pagesCache.get(page()) || await fetch(`./src/templates/${res.extends}.json`)
						.then(res => res.json());
					
					pagesCache.set(res.extends, base);
				}
				
				setTemplate(res);
				pagesCache.set(page(), res);
				setTemplateStatus('loaded');
			})
			.catch(err => {
				setTemplateStatus('error');
				console.error(err);
			})
	}
})

// parse page template content
effect(() => {
	if(/loaded|ready/.test(templateStatus()) && template()) {
		let temp = template();
		
		if (temp.extends && pagesCache.has(temp.extends)) {
			temp = mergeObjects(pagesCache.get(temp.extends), temp);
		}
		
		parseTemplate(temp)
			.then(setTemplateContent)
			.catch(err => {
				setTemplateStatus('error');
				console.error(err);
			})
			.finally(() => {
				setTemplateStatus('ready');
				pagesCache.set(page(), template());
				
				renderNodes.clear();
				
				traverseContent(template().content, (node) => {
					renderNodes.set(node['data-render-id'], node)
				})
			})
	}
})

// load widget
effect(() => {
	if (currentWidgetId()) {
		setCurrentWidgetStatus('loading');
		
		if (widgetsCache.has(currentWidgetId())) {
			setCurrentWidget(widgetsCache.get(currentWidgetId()));
			setCurrentWidgetStatus('ready');
		} else {
			import(`./widgets/${currentWidgetId()}.js`)
				.then(res => res.default)
				.then(w => {
					setCurrentWidget(w);
					widgetsCache.set(currentWidgetId(), w);
					setCurrentWidgetStatus('ready');
				})
				.catch(err => {
					console.error(err);
					setCurrentWidgetStatus('error');
				})
		}
	} else {
		setCurrentWidget(null);
		setCurrentWidgetStatus('idle');
	}
})

function publishApp() {
	setPublishStatus('publishing...')
	fetch("/.netlify/functions/publish-app")
		.then(res => res.json())
		.then(res => {
			setPublishStatus('published')
			console.log(res)
			setTimeout(() => {
				setPublishStatus('publish');
			}, 2000)
		})
		.catch(console.error);
}

function saveTemplate() {
	updatePendingChanges(0);
	setPublishStatus('saving...')
	fetch("/.netlify/functions/save-template", {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(template())
	})
		.then(res => res.json())
		.then(res => {
			setPublishStatus('saved')
			console.log(res)
			setTimeout(() => {
				setPublishStatus('save');
			}, 2000)
		})
		.catch(console.error);
}

const iFrameLoadHandler = (event) => {
	const doc = event.target.contentDocument;
	const canvasStyleEl = document.createElement('style');
	let currentWidgetEl = null;
	let currentHighlightWidgetEl = null;
	
	const style = doc.createElement('style');
	style.innerHTML = `
	html, body {
		width: 100%;
		height: 100%;
		padding: 0;
		margin: 0;
	}

	*, *::before, *::after {
		box-sizing: border-box;
	}

	widget {
		border: 1px solid transparent;
		cursor: pointer;
		display: block;
	}

	widget[highlight] {
		border-color: #15b8c7;
	}
	
	widget[active] {
		border-color: #920deb;
	}
	`.replace(/\s{2,}/g, ' ').replace(/[\t\n]+/g, '')
	
	doc.head.appendChild(style)
	
	doc.addEventListener('click', (event) => {
		event.stopPropagation();
		event.preventDefault();
		const widgetEl = event.target.closest('widget');
		
		if (widgetEl) {
			const widgetId = widgetEl.getAttribute('id');
			currentWidgetEl?.removeAttribute('active');
			setCurrentWidgetId(widgetId);
			currentWidgetRenderId = widgetEl.dataset.renderId;
			currentWidgetEl = widgetEl;
			currentWidgetEl?.setAttribute('active', '');
		} else {
			currentWidgetEl?.removeAttribute('active');
			setCurrentWidgetId('')
			currentWidgetRenderId = '';
		}
	})
	
	doc.body.addEventListener('mouseout', () => {
		currentHighlightWidgetEl?.removeAttribute('highlight');
	})
	
	doc.body.addEventListener('mousemove', (event) => {
		const x = event.clientX;
		const y = event.clientY;
		const mouseEl = doc.elementFromPoint(x, y);
		
		if (mouseEl) {
			const widgetEl = mouseEl.closest('widget');
			
			if (widgetEl) {
				currentHighlightWidgetEl?.removeAttribute('highlight');
				currentHighlightWidgetEl = widgetEl;
				currentHighlightWidgetEl?.setAttribute('highlight', '');
			}
		}
	})
};

const renderControl = def => {
	const renderedNode = renderNodes.get(currentWidgetRenderId) ?? {}
	
	return controls({
		...def,
		value: renderedNode[def.name] ?? def.value
	}, newValue => {
		setTemplate(prev => {
			renderedNode[def.name] = newValue;
			return {...prev}
		})
		updatePendingChanges(prev => prev + 1);
	})
}

const canvasIFrame = html`<iframe srcdoc="${templateContent}" onload="${iFrameLoadHandler}" />`;
const loading = html`<p>loading...</p>`;

function traverseContent(content, cb) {
	for (let node of content) {
		if(cb(node)) {
			return;
		}
		
		traverseContent(node.children, cb)
	}
}

export default html`
	<link rel="stylesheet" href="./src/app.css">
	<header>
		<h1>CMS (${pick(user, 'nickname')})</h1>
		<div class="actions">
			<button type="button"
			        class="save-btn"
			        disabled="${or(is(publishStatus, 'saving...'), is(pendingChanges, 0))}"
			        onclick="${saveTemplate}">
				${saveStatus} ${when(pendingChanges, html`<em>(${pendingChanges})</em>`)}
			</button>
			<button type="button"
			        onclick="${publishApp}"
			        disabled="${is(publishStatus, 'publishing...')}"
			        class="publish-btn ${publishStatus}"
			>${publishStatus}</button>
		</div>
	</header>
	<main>
		<div id="controls">
			${when(is(currentWidgetStatus, 'loading'), loading)}
			${when(is(currentWidgetStatus, 'error'), html`<p>failed to load widget controls</p>`)}
			${repeat(() => currentWidget()?.inputs || [], renderControl)}
		</div>
		<div id="canvas">
			${when(oneOf(templateStatus, ['idle', 'loading', 'loaded']), loading)}
			${when(is(templateStatus, 'error'), html`<p>failed to load page</p>`)}
			${when(is(templateStatus, 'ready'), canvasIFrame)}
		</div>
	</main>
`;
