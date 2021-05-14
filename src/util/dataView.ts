/**
 * If a Power BI column or measure contains characters that create problems in JSON or Vega/Vega-Lite expressions
 * and encodings, we will replace them with an underscore, which is much easier to educate people on than having
 * to learn all the specifics of escaping in the right context, in the right way.
 *
 *  - Vega:         https://vega.github.io/vega/docs/types/#Field
 *  - Vega-Lite:    https://vega.github.io/vega-lite/docs/field.html
 *
 * @param displayName - display name of column or measure to resolve
 */
export function encodeDataViewFieldForSpec(displayName: string) {
    return displayName.replace(/([\\".\[\]])/g, '_');
}
