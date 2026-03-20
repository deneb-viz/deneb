/**
 * Copy text to the clipboard using a textarea workaround.
 *
 * The standard Clipboard API is blocked by Power BI's iframe sandbox, so we use legacy means.
 */
export const copyToClipboard = (text: string): void => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.value = text;
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
};
