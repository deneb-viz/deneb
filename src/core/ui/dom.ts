import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import EditMode = powerbi.EditMode;
import ViewMode = powerbi.ViewMode;

import {
    resolveObjectProperties,
    updateObjectProperties
} from '../utils/properties';
import { logDebug } from '../../features/logging';

const viewportAdjust = 4;

export const getReportViewport = (
    viewport: IViewport,
    persistedViewport: IViewport
) => ({
    height: (persistedViewport.height || viewport.height) - viewportAdjust,
    width: (persistedViewport.width || viewport.width) - viewportAdjust
});

/**
 * Convert a value intended for pt to a px equivalent.
 */
export const ptToPx = (value: number) => value * (1 / 3 + 1);

/**
 * For suitable events, ensure that the visual viewport is correctly resolved and persisted. This will allow us to keep the
 * viewport upon re-initialisation (e.g. if swapping visuals out or reloading the dev visual).
 */
export const resolveReportViewport = (
    viewport: IViewport,
    viewMode: ViewMode,
    editMode: EditMode,
    newViewport: IViewport
) => {
    if (
        editMode === EditMode.Default &&
        viewMode === ViewMode.Edit &&
        (newViewport.height !== viewport.height ||
            newViewport.width !== viewport.width)
    ) {
        logDebug('Persisting viewport to properties...');
        updateObjectProperties(
            resolveObjectProperties([
                {
                    objectName: 'stateManagement',
                    properties: [
                        {
                            name: 'viewportHeight',
                            value: viewport.height
                        },
                        {
                            name: 'viewportWidth',
                            value: viewport.width
                        }
                    ]
                }
            ])
        );
    }
};
