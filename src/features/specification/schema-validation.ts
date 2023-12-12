import Ajv from 'ajv';
import * as vegaSchema from 'vega/build/vega-schema.json';
import * as vegaLiteSchema from 'vega-lite/build/vega-lite-schema.json';
import * as draft06 from 'ajv/lib/refs/json-schema-draft-06.json';

import merge from 'lodash/merge';
import {
    VEGA_SCHEME_POWERBI_DIVERGENT,
    VEGA_SCHEME_POWERBI_LINEAR,
    VEGA_SCHEME_POWERBI_NOMINAL,
    VEGA_SCHEME_POWERBI_ORDINAL
} from '../../constants';

/**
 * Array of custom schemes, for incorporation into schemas.
 */
const POWERBI_CUSTOM_SCHEMES = [
    VEGA_SCHEME_POWERBI_DIVERGENT,
    VEGA_SCHEME_POWERBI_LINEAR,
    VEGA_SCHEME_POWERBI_NOMINAL,
    VEGA_SCHEME_POWERBI_ORDINAL
];

/**
 * Add custom schemes to Vega-Lite schema.
 */
const VEGA_LITE_SCHEMA_POWERBI = merge(vegaLiteSchema, {
    definitions: {
        Diverging: {
            enum: [
                ...vegaLiteSchema.definitions.Diverging.enum,
                ...POWERBI_CUSTOM_SCHEMES
            ]
        }
    }
});

export type GetProviderValidatorOptions = {
    provider: SchemaProvider;
    version?: string;
    isConfig?: boolean;
};

/**
 * Record of all schema providers andthe JSON for the specified versions.
 */
export type SchemaProviderReference = {
    [key in SchemaProvider]: SchemaProviderMetadata;
};

/**
 * Represents the JSON schema metadata for a given provider version.
 */
export type SchemaProviderMetadata = {
    [key: string]: any;
};

/**
 * Valid provider types for JSON schemas used in Deneb.
 */
export type SchemaProvider = 'vega' | 'vegaLite';

export type GetValidationResultsOptions = GetProviderValidatorOptions & {
    content: string;
};

/**
 * Borrowed from vega-editor.
 * Adds markdownDescription props to a schema. See https://github.com/Microsoft/monaco-editor/issues/885
 */
const addMarkdownProps = (value: any) => {
    if (typeof value === 'object' && value !== null) {
        if (value.description) {
            value.markdownDescription = value.description;
        }
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                value[key] = addMarkdownProps(value[key]);
            }
        }
    }
    return value;
};

/**
 * Importing the schemas as JSON modules makes them immutable, so in order to
 * process them for markdown props, we need to clone them first. As we only
 * need to do this once per schema, it makes sense to do it here.
 */
const getSchemaWithMarkdownProps = (schema: any) =>
    addMarkdownProps(JSON.parse(JSON.stringify(schema)));

/**
 * Create a common validator, with the necessary schema support for Vega/
 * Vega-Lite.
 */
export const BASE_VALIDATOR = new Ajv({
    allErrors: true,
    verbose: true,
    jsonPointers: false,
    $data: true
});
BASE_VALIDATOR.addMetaSchema(draft06);
BASE_VALIDATOR.addFormat('color-hex', () => true);

/**
 * Mapping of schema providers to their versions.
 */
const SCHEMA_MAPPING: SchemaProviderReference = {
    vega: {
        current: getSchemaWithMarkdownProps(vegaSchema)
    },
    vegaLite: {
        current: getSchemaWithMarkdownProps(VEGA_LITE_SCHEMA_POWERBI)
    }
};

/**
 * For a validator, process and return any errors in string format.
 */
export const getFriendlyValidationErrors = (errors: Ajv.ErrorObject[]) =>
    errors.map(
        (error) =>
            `${error.dataPath ?? '/'} ${error.message} of ${error.schemaPath}`
    );

/**
 * Look-up and return the desired schema, based on provider and version.
 */
export const getProviderSchema = ({
    provider,
    version = 'current',
    isConfig = false
}: GetProviderValidatorOptions) => {
    if (isConfig) return {};
    return SCHEMA_MAPPING[provider][version];
};

/**
 * For the specified provider and version, return the validator function.
 */
export const getProviderValidator = ({
    provider,
    version = 'current',
    isConfig = false
}: GetProviderValidatorOptions): Ajv.ValidateFunction =>
    BASE_VALIDATOR.compile(getProviderSchema({ provider, version, isConfig }));
