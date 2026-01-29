import type {
    SchemaValidationResult,
    SchemaValidator,
    SpecProvider
} from '@deneb-viz/vega-runtime/spec-processing';
import {
    getProviderValidator,
    getFriendlyValidationErrors
} from '@deneb-viz/json-processing';

/**
 * Configuration limits for incremental data updates.
 * Controls the SpinButton behavior and validation for the threshold setting.
 */
export const INCREMENTAL_UPDATE_CONFIGURATION = {
    /** Whether incremental updates are enabled by default */
    enabledDefault: false,
    /** Minimum allowed threshold value */
    minThreshold: 5,
    /** Maximum allowed threshold value (hard limit based on Vega changeset performance) */
    maxThreshold: 5000,
    /** Default threshold value */
    defaultThreshold: 500,
    /** Step increment for the SpinButton */
    stepValue: 5
};

/**
 * Creates a schema validator function for the given provider.
 * The validator checks the spec against the Vega/Vega-Lite JSON schema
 * and returns any validation warnings.
 *
 * @param provider - The spec provider ('vega' or 'vegaLite')
 * @returns A schema validator function
 */
export const createSchemaValidator = (
    provider: SpecProvider
): SchemaValidator => {
    const validator = getProviderValidator({ provider });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (spec: any): SchemaValidationResult => {
        const valid = validator(spec);
        if (valid || !validator.errors) {
            return { valid: true, warnings: [] };
        }
        const warnings = getFriendlyValidationErrors(validator.errors).map(
            (error) => `Validation: ${error}`
        );
        return { valid: false, warnings };
    };
};
