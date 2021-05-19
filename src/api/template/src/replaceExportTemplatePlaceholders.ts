import { getExportFieldTokenPatterns } from './getExportFieldTokenPatterns';
import { replaceTemplateFieldWithToken } from './replaceTemplateFieldWithToken';

export const replaceExportTemplatePlaceholders = (
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
