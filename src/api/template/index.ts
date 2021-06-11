export {
    getEscapedReplacerPattern,
    getExportFieldTokenPatterns,
    replaceExportTemplatePlaceholders,
    replaceTemplateFieldWithToken
};

const getEscapedReplacerPattern = (value: string) => {
    return value.replace(/[-\/\\^$*+?.()&|[\]{}]/g, '\\$&');
};

const getExportFieldTokenPatterns = (name: string) => {
    const namePattern = getEscapedReplacerPattern(name);
    return [
        `(")(${namePattern})(")`,
        `(\\\.)(${namePattern})()`,
        `(')(${namePattern})(')`
    ];
};

const replaceExportTemplatePlaceholders = (
    template: string,
    name: string,
    token: string
) => {
    let replacedTemplate = template;
    getExportFieldTokenPatterns(name).forEach(
        (pattern) =>
            (replacedTemplate = replaceTemplateFieldWithToken(
                replacedTemplate,
                pattern,
                token
            ))
    );
    return replacedTemplate;
};

const replaceTemplateFieldWithToken = (
    template: string,
    pattern: string,
    token: string
) => template.replace(new RegExp(pattern, 'g'), `$1${token}$3`);
