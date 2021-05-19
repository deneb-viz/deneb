export const replaceTemplateFieldWithToken = (
    template: string,
    pattern: string,
    token: string
) => {
    return template.replace(new RegExp(pattern, 'g'), `$1${token}$3`);
};
