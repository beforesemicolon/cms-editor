export const deepValue = (obj, key) => {
  const keyParts = String(key ?? '').split('.').filter(Boolean)
  
  return keyParts.reduce((acc, k) => {
    return acc && typeof acc === 'object' ? acc[k] : undefined
  }, obj)
}
