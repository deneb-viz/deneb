export const encodeFieldForSpec = (displayName: string) => {
    return displayName.replace(/([\\".\[\]])/g, '_');
};
