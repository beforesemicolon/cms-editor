import {inputDefinitionsToObject} from "./input-definitions-to-object.js";
import {replaceStringValue} from "./replace-string-value.js";
import {turnCamelToKebabCasing} from "./turn-camel-to-kebab-casing.js";

const widgetCache = new Map();

export const parseTemplate = async (temp = {}, prod = false) => {
  const {
    metadata = {},
    scripts = [],
    stylesheets = [],
    links = [],
    fonts = [],
    favicons = [],
    manifest,
    content,
    ...data
  } = temp;
  
  let widgetStyles = new Map();
  
  const bodyContent = await parseContent(content, data, widgetStyles)
  
  if (!metadata['charset']) {
    metadata['charset'] = 'UTF-8';
  }
  
  if (!metadata['viewport']) {
    metadata['viewport'] = 'width=device-width, initial-scale=1.0';
  }
  
  let metas = Object.entries(metadata)
    .map(([key, value]) => {
      if (key.startsWith('property:')) {
        return `<meta property="${key.replace('property:', '')}" content="${value}">`
      }
      
      return `<meta name="${key}" content="${value}">`
    })
    .join('');
  
  let ls = '';
  
  links.forEach((link) => {
    let l = '<link ';
    
    Object.entries(link).forEach(([key, value]) => {
      l += `${key}="${value}" `
    })
    
    ls += l + '/>'
  });
  
  let fi = '';
  
  favicons.forEach((link) => {
    let l = '<link ';
    
    Object.entries(link).forEach(([key, value]) => {
      l += `${key}="${key === "href" ? "./assets/favicons/" : ""}${value}" `
    })
    
    fi += l + '/>'
  });
  
  let ft = '';
  
  fonts.forEach((font) => {
    ft += `<link rel="preload" href="./assets/fonts/${font}" as="font" crossorigin="anonymous">`
  });
  
  let st = '';
  
  [...stylesheets, ...Array.from(widgetStyles.entries())].forEach((stylesheet) => {
    if (typeof stylesheet === 'string') {
      if (stylesheet.startsWith('http')) {
        st += `<link rel="stylesheet" href="${stylesheet}" >`
      } else if (stylesheet.endsWith('.css')) {
        st += `<link rel="stylesheet" href="./stylesheets/${stylesheet}">`
      } else {
        st += `<style>${stylesheet}</style>`
      }
    } else if(Array.isArray(stylesheet)) {
      const [id, style] = stylesheet;
      st += `<style id="${id}">${parseStyle(style)}</style>`;
    } else {
      st += `<style`;
      
      Object.entries(stylesheet.attributes).forEach(([key, value]) => {
        st += `${key}="${value}" `
      })
      
      st += '></style>'
    }
  });
  
  let sc = '';
  
  (temp.scripts ?? []).forEach((script) => {
    if (typeof script === 'string') {
      if (script.startsWith('http')) {
        sc += `<script src="${script}"></script>`
      } else if (script.endsWith('.js')) {
        sc += `<script src="./scripts/${script}"></script>`
      } else {
        sc += `<script>${script}</script>`
      }
    } else {
      sc += '<script ';
      
      Object.entries(script).forEach(([key, value]) => {
        sc += `${key}="${value}" `
      })
      
      sc += `></script>`
    }
  });
  
  return `<!doctype html>
<html lang="${data.lang ?? 'en'}">
<head>
  <title>${data.title}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- og -->
  <meta property="og:title" content="${data.title}">
  <meta property="og:type" content="website">
  <meta property="og:description" content="${data.description}">
  <meta property="og:image" content="${data.image}">
  <meta property="og:url" content="${data.domain}">
  <meta property="og:site_name" content="${data.title}">
  ${metas ? `<!-- metas -->${metas}` : ''}
  ${fi ? `<!-- favicons -->${fi}` : ''}
  ${ft ? `<!-- fonts -->${ft}` : ''}
  ${ls ? `<!-- links -->${ls}` : ''}
  ${manifest ? `<link rel="manifest" href="./assets/${manifest}">` : ''}
  ${st ? `<!-- stylesheets -->${st}` : ''}
</head>
<body>
${bodyContent}
${sc ? '<!-- scripts -->' + sc : ''}
</body>
</html>`.replace(/\s{2,}/g, ' ').replace(/[\t\n]+/g, '')
}

function parseStyle(style) {
  return Object.entries(style).map(([key, value]) => {
    if (typeof value === 'object') {
      return `${turnCamelToKebabCasing(key)} { ${parseStyle(value)} }`
    }
    
    return `${turnCamelToKebabCasing(key)}: ${value};`
  }).join(' ')
}

async function parseContent(content, data = {}, widgetStyles) {
  return (await Promise.all(
    content
      .map(async (node) => {
        
        if (typeof node === 'string') {
          return replaceStringValue(node, data);
        }
        
        let {name, children, ...attributes} = node;
        
        if (name === 'widget') {
          node['data-render-id'] = node['data-render-id'] || Math.random().toString(36).substring(2, 15);
          
          ({name, children, ...attributes} = node);
          
          if (attributes.id) {
            const widget = widgetCache.get(attributes.id) || (await import(`../widgets/${attributes.id}.js`)).default;
            
            if(typeof widget?.render === 'function') {
              children = [
                widget.render({
                  ...inputDefinitionsToObject(widget.inputs),
                  ...attributes,
                  env: data
                })
              ]
            } else {
              children = widget.content ? [widget.content] : [];
            }
            
            if (widget.style) {
              widgetStyles.set(attributes.id, widget.style)
            }
            
            widgetCache.set(attributes.id, widget)
          }
        }
        
        const attrs = Object
          .entries(attributes)
          .map(([name, value]) => {
            
            if (typeof value === 'string') {
              value = replaceStringValue(value, data)
            }
            
            return `${name}="${value}"`
          })
          .join(' ');
        
        return `<${name}` + (attrs ? ` ${attrs}` : '') + `>${await parseContent(children)}</${name}>`
      })
  )).join('')
}
