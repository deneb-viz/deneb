import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import EditMode = powerbi.EditMode;
import ViewMode = powerbi.ViewMode;

import { logDebug } from '@deneb-viz/utils/logging';
import {
    persistProperties,
    resolveObjectProperties
} from '@deneb-viz/powerbi-compat/visual-host';

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
    const isEditEligible =
        editMode === EditMode.Default &&
        viewMode === ViewMode.Edit &&
        (newViewport.height !== viewport.height ||
            newViewport.width !== viewport.width);
    const isViewEligible =
        viewMode === ViewMode.View &&
        (newViewport.height !== viewport.height ||
            newViewport.width !== viewport.width);
    if (isEditEligible || isViewEligible) {
        logDebug('Persisting viewport to properties...');
        persistProperties(
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
