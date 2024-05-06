export {
    resetProviderPropertyValue,
    updateBooleanProperty,
    updateLogLevel,
    updateProvider,
    updateSelectionMaxDataPoints,
    updateSelectionMode,
    updateRenderMode
};

import {
    getProviderVersionProperty,
    IPersistenceProperty,
    resolveObjectProperties,
    updateObjectProperties
} from '../utils/properties';
import { TSpecProvider, TSpecRenderMode } from '../vega';
import { PROPERTY_DEFAULTS } from '../../../config';
import { SelectionMode } from '@deneb-viz/core-dependencies';

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
    const value: string = PROPERTY_DEFAULTS.vega?.[propertyKey];
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
const updateProvider = (
    provider: TSpecProvider,
    currentSelectionMode: SelectionMode
) =>
    handlePersist([
        { name: 'provider', value: provider },
        {
            name: 'selectionMode',
            value: provider === 'vegaLite' ? 'simple' : currentSelectionMode
        },
        getProviderVersionProperty(provider)
    ]);

/**
 * Handle the change in selection mode from one to the other and update necessary store dependencies and properties.
 */
const updateSelectionMode = (
    selectionMode: SelectionMode,
    provider: TSpecProvider
) =>
    handlePersist([
        {
            name: 'selectionMode',
            value: provider === 'vegaLite' ? 'simple' : selectionMode
        }
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
