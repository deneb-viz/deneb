/**
 * If a Power BI property value is intended to be treated as JSON, get the parsed value.
 * If the value is not a valid JSON string, return `null`.
 */
export const getParsedPropertyJsonValue = (value: string | null) => {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};
