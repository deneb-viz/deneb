import { logDebug } from '@deneb-viz/utils/logging';
import { type PropertyChange } from './types';

/**
 * Interface for the visual host's persistence capability.
 * This abstracts the Power BI host dependency for testability and decoupling.
 */
export type PersistPropertiesHost = {
    persistProperties: (
        changes: powerbi.VisualObjectInstancesToPersist
    ) => void;
};

/** Injected host reference for property persistence */
let persistPropertiesHost: PersistPropertiesHost | null = null;

/**
 * Bind the visual host for property persistence.
 * Call this during visual initialization.
 */
export const bindPersistPropertiesHost = (host: PersistPropertiesHost) => {
    persistPropertiesHost = host;
    logDebug('[Persistence] Visual host bound for property persistence');
};

/**
 * Persist property changes to Power BI.
 * Batches multiple changes into a single persistProperties call for efficiency.
 */
export const persistProjectProperties = (changes: PropertyChange[]) => {
    if (changes.length === 0) return;

    if (!persistPropertiesHost) {
        logDebug(
            '[Persistence] No visual host available, skipping property persistence'
        );
        return;
    }

    // Group changes by objectName for efficient persistence
    const byObject = changes.reduce(
        (acc, change) => {
            if (!acc[change.objectName]) {
                acc[change.objectName] = {};
            }
            acc[change.objectName][change.propertyName] = change.value;
            return acc;
        },
        {} as Record<string, Record<string, unknown>>
    );

    const instancesToPersist: powerbi.VisualObjectInstancesToPersist = {
        merge: Object.entries(byObject).map(([objectName, properties]) => ({
            objectName,
            selector: null as unknown as powerbi.data.Selector,
            properties
        }))
    };

    logDebug('[Persistence] Persisting project properties to Power BI...', {
        changes
    });
    persistPropertiesHost.persistProperties(instancesToPersist);
};
