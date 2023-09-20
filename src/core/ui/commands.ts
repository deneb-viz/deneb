export {
    resetProviderPropertyValue,
    updateBooleanProperty,
    updateLogLevel,
    updateProvider,
    updateSelectionMaxDataPoints,
    updateRenderMode
};

import {
    getProviderVersionProperty,
    IPersistenceProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../utils/properties';
import { getConfig } from '../utils/config';
import { TSpecProvider, TSpecRenderMode } from '../vega';

/**
 * Actual event handling logic for wrappers
 */

export const closeCreateDialog = () =>
    handlePersist([{ name: 'isNewDialogOpen', value: false }]);

/**
 * Manages persistence of a properties object to the store from an operation.
 */
const handlePersist = (
    properties: IPersistenceProperty[],
    objectName = 'vega'
) =>
    updateObjectProperties(
        resolveObjectProperties([{ objectName, properties }])
    );

/**
 * Reset the specified provider (Vega) visual property to its default value.
 */
const resetProviderPropertyValue = (propertyKey: string) => {
    const value: string = getConfig().propertyDefaults.vega?.[propertyKey];
    handlePersist([{ name: propertyKey, value }]);
};

/**
 * Generic handler for a boolean (checkbox) property in the settings pane.
 */
const updateBooleanProperty = (name: string, value: boolean) =>
    handlePersist([{ name, value }]);

const updateLogLevel = (value: string) => {
    handlePersist([{ name: 'logLevel', value }]);
};

/**
 * Handle the change in provider from one to the other and update necessary store dependencies and properties.
 */
const updateProvider = (provider: TSpecProvider) =>
    handlePersist([
        { name: 'provider', value: provider },
        getProviderVersionProperty(provider)
    ]);

/**
 * Handle the change in maximm permitted underlying data points for selection.
 */
const updateSelectionMaxDataPoints = (value: number) =>
    handlePersist([{ name: 'selectionMaxDataPoints', value }]);

/**
 * Handle the change in render mode from one to the other and update necessary store dependencies and properties.
 */
const updateRenderMode = (renderMode: TSpecRenderMode) =>
    handlePersist([{ name: 'renderMode', value: renderMode }]);
