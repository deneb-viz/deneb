import { getConfig } from '../../core/utils/config';

type TIndentContext = 'editor' | 'tooltip';

export const getJsonAsIndentedString = (
    json: object,
    context: TIndentContext = 'editor'
) =>
    JSON.stringify(
        json,
        null,
        (context === 'editor' && getConfig().propertyDefaults.editor.tabSize) ||
            '\u2800'
    );
