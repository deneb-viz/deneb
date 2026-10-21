import { PROJECT_DEFAULTS } from '@deneb-viz/configuration';

/**
 * Whether a template has just been created but the host has not yet sent
 * the update carrying it.
 *
 * Creating saves the template to the host, then initializes the project in
 * the store. The surface follows the saved spec, which only changes on the
 * host's next update, so in between the store holds a spec while the saved
 * one is still the default. Showing a pending state then keeps the import
 * surface from being used twice.
 */
export const isCreatePending = (
    storeSpec: string | undefined,
    persistedSpec: string | undefined
): boolean =>
    storeSpec !== undefined &&
    storeSpec !== PROJECT_DEFAULTS.spec &&
    (persistedSpec === undefined || persistedSpec === PROJECT_DEFAULTS.spec);
