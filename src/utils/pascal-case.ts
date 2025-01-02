const pascalCase = (str: string) => {
  const parts = str.replace(/\//g, '~').replace(/-/g, '~').replace(/ /g, '~').replace(/\{/g, '').replace(/\}/g, '').split('~');
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
};

export default pascalCase;
