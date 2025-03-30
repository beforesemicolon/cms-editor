import {deepValue} from "./deep-value.js";

export const replaceStringValue = (value, data) => {
  let match = null
  
  while((match = /{{([a-z0-9.$_]+)}}/gim.exec(value)) !== null) {
    const [full, key] = match;
    const dv = deepValue(data, key)
    
    value = value.replace(full, String(dv));
  }
  
  return value
}
