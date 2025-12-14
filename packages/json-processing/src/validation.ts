import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import { mergician } from 'mergician';
import addFormats from 'ajv-formats';
import { VEGA_LITE_SCHEME_ADDITIONS } from '@deneb-viz/vega-runtime/extensibility';
import {
    type GetProviderValidatorOptions,
    type SchemaProviderReference
} from './lib/spec-processing';

/**
 * All schemas required for validation functions.
 */
import * as vegaSchema from 'vega/vega-schema.json';
import * as vegaLiteSchema from 'vega-lite/vega-lite-schema.json';
import * as draft06Schema from 'ajv/lib/refs/json-schema-draft-06.json';
import * as denebUserMetaSchema from '@deneb-viz/template-usermeta/schema.deneb-template-usermeta.json';

/**
 * Create a common validator, with the necessary schema support for Vega/
 * Vega-Lite.
 */
const BASE_VALIDATOR = new Ajv({
    strict: false
});
addFormats(BASE_VALIDATOR);
BASE_VALIDATOR.addMetaSchema(draft06Schema);
// istanbul ignore next
BASE_VALIDATOR.addFormat('color-hex', () => true);

const CURRENT_VERSION = 'current';

/**
 * Add custom schemes to Vega-Lite schema.
 */
const vegaLiteSchemaClone: typeof vegaLiteSchema =
    structuredClone(vegaLiteSchema);

const VEGA_LITE_SCHEMA_POWERBI = mergician(vegaLiteSchemaClone, {
    definitions: {
        Categorical: {
            enum: [
                ...vegaLiteSchema.definitions.Categorical.enum,
                ...VEGA_LITE_SCHEME_ADDITIONS.categorical
            ]
        },
        Diverging: {
            enum: [
                ...vegaLiteSchema.definitions.Diverging.enum,
                ...VEGA_LITE_SCHEME_ADDITIONS.diverging
            ]
        },
        SequentialMultiHue: {
            enum: [
                ...vegaLiteSchema.definitions.SequentialMultiHue.enum,
                ...VEGA_LITE_SCHEME_ADDITIONS.sequential
            ]
        }
    }
});

/**
 * Borrowed from vega-editor.
 * Adds markdownDescription props to a schema. See https://github.com/Microsoft/monaco-editor/issues/885
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * For a validator, process and return any errors in string format.
 */
export const getFriendlyValidationErrors = (errors: ErrorObject[]) => {
    return errors.map(
        (error) =>
            `${error.instancePath} ${error.message} of ${error.schemaPath}`
    );
};

/**
 * Importing the schemas as JSON modules makes them immutable, so in order to process them for markdown props, we need
 * to clone them first. As we only need to do this once per schema, it makes sense to do it here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSchemaWithMarkdownProps = (schema: any) =>
    addMarkdownProps(structuredClone(schema));

/**
 * Mapping of schema providers to their versions.
 */
const SCHEMA_MAPPING: SchemaProviderReference = {
    vega: {
        current: getSchemaWithMarkdownProps(vegaSchema)
    },
    vegaLite: {
        current: getSchemaWithMarkdownProps(VEGA_LITE_SCHEMA_POWERBI)
    },
    denebUserMeta: {
        current: denebUserMetaSchema
    }
};

/**
 * Look-up and return the desired schema, based on provider and version.
 */
export const getProviderSchema = ({
    provider,
    version = CURRENT_VERSION,
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
}: GetProviderValidatorOptions): ValidateFunction =>
    BASE_VALIDATOR.compile(getProviderSchema({ provider, version, isConfig }));
