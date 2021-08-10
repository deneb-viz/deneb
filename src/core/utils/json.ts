export {
    cleanParse,
    getBaseValidator,
    getJsonAsIndentedString,
    getSchemaValidator
};

import Ajv from 'ajv';
import * as draft06 from 'ajv/lib/refs/json-schema-draft-06.json';

import { getConfig } from '../../core/utils/config';
import { isFeatureEnabled } from './features';

type TIndentContext = 'editor' | 'tooltip';

/**
 * Intended to be used as a substitute for `JSON.parse`; will ensure that any supplied `content` is sanitised for URLs
 * (if blocking them) prior to a regular parse. The optional `fallback` allows the caller to provide a default to provide
 * if the parse fails (will return empty object (`{}`) if not supplied).
 */
const cleanParse = (content: string, fallback?: string) => {
    try {
        return JSON.parse(resolveUrls(content));
    } catch {
        return JSON.parse(fallback || '{}');
    }
};

/**
 * Get a new instance of `Ajv`, with the necessary base configuration for validating a Vega or Vega-Lite specification.
 */
const getBaseValidator = () =>
    new Ajv({}).addFormat('color-hex', () => true).addMetaSchema(draft06);

const getJsonAsIndentedString = (
    json: object,
    context: TIndentContext = 'editor'
) =>
    JSON.stringify(
        json,
        null,
        (context === 'editor' && getConfig().propertyDefaults.editor.tabSize) ||
            '\u2800'
    );

/**
 * Apply the supplied JSON schema to a `getBaseValidator` and attempt to compile it.
 */
const getSchemaValidator = (schema: Object) =>
    getBaseValidator().compile(schema);

/**
 * For a given body of text, replace anything that looks like a remote URI with blank text. If the URI has a `data:`
 * prefix then we'll allow it, so that the user can specify base64 content.
 */
const resolveUrls = (content: string) =>
    (!isFeatureEnabled('enableExternalUri') &&
        content.replace(
            /\b(?!data:)((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/g,
            ''
        )) ||
    content;
