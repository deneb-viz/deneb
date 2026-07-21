import type {
    SchemaValidator,
    SpecProvider
} from '@deneb-viz/vega-runtime/spec-processing';
import { getEditorSchemaValidator } from '../schema';

export { INCREMENTAL_UPDATE_CONFIGURATION } from './incremental-update-configuration';

/**
 * Creates a schema validator function for the given provider.
 * Delegates to the pre-compiled validator from the schema service,
 * which is initialized during editor startup via Suspense gating.
 *
 * @param provider - The spec provider ('vega' or 'vegaLite')
 * @returns A schema validator function
 */
export const createSchemaValidator = (
    provider: SpecProvider
): SchemaValidator => getEditorSchemaValidator(provider);
