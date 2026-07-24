/**
 * Copy text to the clipboard using a textarea workaround.
 *
 * The standard Clipboard API is blocked by Power BI's iframe sandbox, so we use legacy means.
 *
 * Returns whether the copy command reported success, so callers can
 * surface accurate feedback (e.g. the dev-overlay copy button).
 */
export const copyToClipboard = (text: string): boolean => {
    const textarea = document.createElement('textarea');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.style.opacity = '0';
    textarea.setAttribute('aria-hidden', 'true');
    document.body.appendChild(textarea);
    textarea.value = text;
    try {
        textarea.select();
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        document.body.removeChild(textarea);
    }
};
