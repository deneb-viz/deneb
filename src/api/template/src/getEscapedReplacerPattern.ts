export const getEscapedReplacerPattern = (value: string) => {
    return value.replace(/[-\/\\^$*+?.()&|[\]{}]/g, '\\$&');
};
