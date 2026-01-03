// TODO: correctly integrate once we have migrated host dependencies

import {
    INTERACTIVITY_DEFAULTS,
    type SelectionMode
} from '@deneb-viz/powerbi-compat/interactivity';
import {
    type PersistenceProperty,
    persistProperties,
    resolveObjectProperties
} from '../../lib/persistence';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';

/**
 * Generic handler for a boolean (checkbox) property in the settings pane.
 */
export const handlePersistBooleanProperty = (name: string, value: boolean) =>
    setVisualProperty([{ name, value }]);

/**
 * Reset the specified provider (Vega) visual property to its default value.
 */
export const handleResetVegaProperty = (
    propertyKey: keyof typeof INTERACTIVITY_DEFAULTS
) => {
    const value = INTERACTIVITY_DEFAULTS[propertyKey];
    setVisualProperty([{ name: propertyKey, value }]);
};

/**
 * Handle the change in maximum permitted underlying data points for selection.
 */
export const handleSelectionMaxDataPoints = (value: number) =>
    setVisualProperty([{ name: 'selectionMaxDataPoints', value }]);

/**
 * Handle the change in selection mode from one to the other and update necessary store dependencies and properties.
 */
export const handleSelectionMode = (
    selectionMode: SelectionMode,
    provider: SpecProvider
) =>
    setVisualProperty([
        {
            name: 'selectionMode',
            value: provider === 'vegaLite' ? 'simple' : selectionMode
        }
    ]);

/**
 * Manages persistence of a properties object to the store from an operation.
 */
const setVisualProperty = (
    properties: PersistenceProperty[],
    objectName = 'vega'
) => persistProperties(resolveObjectProperties([{ objectName, properties }]));
