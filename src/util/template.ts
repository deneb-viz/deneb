export {
    getEscapedReplacerPattern,
    getExportFieldTokenPatterns,
    replaceExportTemplatePlaceholders,
    replaceTemplateFieldWithToken
};

/**
 * When exporting a template, any occurrences of columns or measures need to be replaced in the spec. This takes a
 * given `ITemplateDatasetField` and stringified spec, and will:
 *
 * 1. Encode the name for safe encapsulation.
 * 2. Iterate through known patterns where the placeholder could be referred to for encodings and expressions and
 *      replace them in the supplied spec.
 * 3. Return the modified spec.
 *
 * @param template stringified template to search and replace
 * @param name the name of the desired placeholder to swap out
 * @param token the token we should use to replace any instances of placeholder name
 * @returns template with all occurrences replaced with token
 */
function replaceExportTemplatePlaceholders(
    template: string,
    name: string,
    token: string
) {
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
}

/**
 * As fields can be used in a variety of places in a spec, this generate an array of regex patterns we should use to
 * match eligible placeholders in export templates. All patterns should contain three capture groups:
 * 
 * $1: Preceding pattern used to identify placeholder
 * $2: The resolved field placeholder
 * $3: Trailing pattern used to identify placeholder
 *
 * @param name the placeholder name to process
 * @returns RegEx array of that should match all occurrences of specified placeholder name within a template
 */
function getExportFieldTokenPatterns(name: string) {
    const namePattern = getEscapedReplacerPattern(name);
    return [
        `(")(${namePattern})(")`,
        `(\\\.)(${namePattern})()`,
        `(')(${namePattern})(')`
    ];
}

/**
 * For a supplied template, pattern and token, perform a global replace on all occurrences and return it.
 * 
 * @param template stringified template to search and replace
 * @param pattern RegEx patternt to search template with. As per notes in `getExportFieldTokenPatterns`, this pattern
 *  requires three capture groups in its definition in order to ensure that preceding and trailing patterns used to
 *  identify a placeholder are preserved.
 * @param token the token we should use to replace any instances of placeholder name
 * @returns processed template, with tokens in-place of pattern occurrences
 */
function replaceTemplateFieldWithToken(
    template: string,
    pattern: string,
    token: string
) {
    return template.replace(new RegExp(pattern, 'g'), `$1${token}$3`);
}

/**
 * When performing placeholder replacements, we need to ensure that special characters used in regex qualifiers are
 * suitable escaped so that we don't inadvertently mangle them.
 *
 * @param value value to scan/substitute
 * @returns escaped string, suitable for pattern matching if special characters are used
 */
function getEscapedReplacerPattern(value: string) {
    return value.replace(/[-\/\\^$*+?.()&|[\]{}]/g, '\\$&');
}
