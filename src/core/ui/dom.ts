import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import EditMode = powerbi.EditMode;
import ViewMode = powerbi.ViewMode;

import DisplaySettings from '../../properties/display-settings';
import {
    resolveObjectProperties,
    updateObjectProperties
} from '../utils/properties';
import { logDebug } from '../../features/logging';

const viewportAdjust = 4;

export const getReportViewport = (
    viewport: IViewport,
    displaySettings: DisplaySettings
) => ({
    height:
        (displaySettings.viewportHeight || viewport.height) - viewportAdjust,
    width: (displaySettings.viewportWidth || viewport.width) - viewportAdjust
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
    displaySettings: DisplaySettings
) => {
    if (
        editMode === EditMode.Default &&
        viewMode === ViewMode.Edit &&
        (displaySettings.viewportHeight !== viewport.height ||
            displaySettings.viewportWidth !== viewport.width)
    ) {
        logDebug('Persisting viewport to properties...');
        updateObjectProperties(
            resolveObjectProperties([
                {
                    objectName: 'display',
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
