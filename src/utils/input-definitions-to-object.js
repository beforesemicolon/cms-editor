export function inputDefinitionsToObject(inputDefinitions) {
  return inputDefinitions.reduce((acc, {name, value, type, definitions}) => {
    
    switch (type) {
      case 'group':
        acc[name] = inputDefinitionsToObject(definitions);
        break;
      default:
        acc[name] = value;
    }
    
    return acc;
  }, {})
}
