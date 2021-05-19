import { getEscapedReplacerPattern } from './getEscapedReplacerPattern';

export const getExportFieldTokenPatterns = (name: string) => {
    const namePattern = getEscapedReplacerPattern(name);
    return [
        `(")(${namePattern})(")`,
        `(\\\.)(${namePattern})()`,
        `(')(${namePattern})(')`
    ];
};
