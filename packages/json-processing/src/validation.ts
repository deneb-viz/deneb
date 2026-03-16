import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

import draft06Schema from 'ajv/lib/refs/json-schema-draft-06.json';
import denebUserMetaSchema from '@deneb-viz/template-usermeta/schema.deneb-template-usermeta.json';

/**
 * Create a common validator, with the necessary schema support.
 * Lazy initialized on first use.
 */
let BASE_VALIDATOR: Ajv | null = null;
const getBaseValidator = () => {
    if (!BASE_VALIDATOR) {
        BASE_VALIDATOR = new Ajv({
            strict: false
        });
        addFormats(BASE_VALIDATOR);
        BASE_VALIDATOR.addMetaSchema(draft06Schema);
        // istanbul ignore next
        BASE_VALIDATOR.addFormat('color-hex', () => true);
    }
    return BASE_VALIDATOR;
};

/**
 * Returns a compiled AJV validator for the denebUserMeta template schema.
 * Used internally by template-usermeta.ts for template validation.
 */
export const getProviderValidator = (): ValidateFunction =>
    getBaseValidator().compile(denebUserMetaSchema);
