import { getVegaSettings, TSpecProvider } from '../../core/vega';
import { IEditorSchema, TEditorRole } from './types';
import { vegaValidator, vegaLiteValidator } from '../../core/vega/validation';
import forIn from 'lodash/forIn';

/**
 * Schemas we wish to resolve when using the editor.
 */
const EDITOR_SCHEMAS: IEditorSchema[] = [
    {
        provider: 'vega',
        role: 'spec',
        schema: <object>vegaValidator.schema
    },
    {
        provider: 'vegaLite',
        role: 'spec',
        schema: <object>vegaLiteValidator.schema
    }
];

/**
 * Borrowed from vega-editor.
 * Adds markdownDescription props to a schema. See https://github.com/Microsoft/monaco-editor/issues/885
 */
const addMarkdownProps = (value: any) => {
    if (typeof value === 'object' && value !== null) {
        if (value.description) {
            value.markdownDescription = value.description;
        }
        forIn(value, (val, key) => {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                value[key] = addMarkdownProps(value[key]);
            }
        });
    }
    return value;
};

/**
 * For the given role, retrieve its value from the visual properties (via store).
 */
export const getEditorInitialText = (role: TEditorRole) => {
    const { jsonConfig, jsonSpec } = getVegaSettings();
    return role === 'spec' ? jsonSpec || '' : jsonConfig;
};

/**
 * Allows an editor to dynamically swap out schema based on provider & role.
 */
export const getEditorSchema = (provider: TSpecProvider, role: TEditorRole) =>
    addMarkdownProps(
        EDITOR_SCHEMAS.find((s) => s.provider === provider && s.role === role)
            ?.schema
    ) || null;
