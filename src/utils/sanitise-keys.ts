const RESERVED_TYPESCRIPT_CHARACTERS = ['?', '!', '[]', '<', '>', '.', ','];

export const sanitisePropKey = (prop: string) => {
  const objectNameContainsReservedCharacters = RESERVED_TYPESCRIPT_CHARACTERS.some((char) => prop.includes(char));

  return objectNameContainsReservedCharacters ? `"${prop}"` : prop;
};

export const sanitiseInterfaceName = (name: string) => {
  return RESERVED_TYPESCRIPT_CHARACTERS.reduce((acc, char) => {
    const escapedRegex = new RegExp(`\\${char}`, 'g');
    return acc.replace(escapedRegex, '_');
  }, name);
};
