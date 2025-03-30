export function mergeObjects(a, b) {
  if (a === null || typeof a !== 'object') return b;
  if (b === null || typeof b !== 'object') return b;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    return Array.from(new Set([...a, ...b]));
  }
  
  const obj = Array.isArray(a) ? [...a] : {...a};
  
  for (const key in b) {
    if (b.hasOwnProperty(key)) {
      if (Array.isArray(a[key]) && Array.isArray(b[key])) {
        obj[key] = Array.from(new Set([...a[key], ...b[key]]));
      } else {
        obj[key] = mergeObjects(obj[key], b[key]);
      }
    }
  }
  
  return obj;
}
