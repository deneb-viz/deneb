import Ajv from 'ajv';

import * as vegaSchema from 'vega/build/vega-schema.json';
import * as vegaLiteSchema from 'vega-lite/build/vega-lite-schema.json';
import * as draft06 from 'ajv/lib/refs/json-schema-draft-06.json';

import { LocalVegaLoggerService } from '../../features/logging';
import { getVegaSettings } from '.';

/**
 * Create a common validator, with the necessary schema support for Vega/
 * Vega-Lite.
 */
const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    jsonPointers: false,
    $data: true
});
ajv.addMetaSchema(draft06);
ajv.addFormat('color-hex', () => true);
export const baseValidator = ajv;

/**
 * Validator for the Vega schema.
 */
export const vegaValidator = ajv.compile(vegaSchema);

/**
 * Validator for the Vega-Lite schema.
 */
export const vegaLiteValidator = ajv.compile(vegaLiteSchema);

/**
 * Obtain the correct validator, based on provider.
 */
export const getValidator = () => {
    const { provider } = getVegaSettings();
    return provider === 'vegaLite' ? vegaLiteSchema : vegaSchema;
};

/**
 * Perform validation of a Vega-Lite specification, passing any specific log
 * output to the view's custom logger.
 */
export const validateVegaLite = (
    spec: Object,
    logger: LocalVegaLoggerService
) => {
    const valid = vegaLiteValidator(spec);
    if (!valid) {
        for (const error of vegaLiteValidator.errors) {
            logger.warn(
                `Validation: ${error.dataPath ?? '/'} ${error.message} of ${
                    error.schemaPath
                }`
            );
        }
    }
};

/**
 * Perform validation of a Vega specification, passing any specific log output
 * to the view's custom logger.
 */
export const validateVega = (spec: Object, logger: LocalVegaLoggerService) => {
    const valid = vegaValidator(spec);
    if (!valid) {
        for (const error of vegaValidator.errors) {
            logger.warn(
                `Validation: ${error.dataPath ?? '/'} ${error.message} of ${
                    error.schemaPath
                }`
            );
        }
    }
};
