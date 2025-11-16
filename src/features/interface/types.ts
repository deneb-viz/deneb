import powerbi from 'powerbi-visuals-api';
import VisualUpdateType = powerbi.VisualUpdateType;
import EditMode = powerbi.EditMode;
import ViewMode = powerbi.ViewMode;
import IViewport = powerbi.IViewport;

import { type IDataset } from '@deneb-viz/dataset/data';
import { type InterfaceMode } from '@deneb-viz/app-core';

/**
 * Parameters that allow us to calculate Deneb's application mode.
 */
export interface IInterfaceModeResolutionParameters {
    /**
     * The current mode (from state). Can be used as a fallback.
     */
    currentMode?: InterfaceMode;
    /**
     * Either the current data view (indicating presence of data to be
     * processed), othe the processed dataset.
     */
    dataset?: IDataset;
    /**
     * Power BI's current edit mode, according to the visual host.
     */
    editMode?: EditMode;
    /**
     * If supplied, specifies the highest order of precedence when resolving
     * application mode.
     */
    invokeMode?: InterfaceMode;
    /**
     * Whether the visual is currently in focus mode (full-screen).
     */
    isInFocus?: boolean;
    /**
     * The specification from the editor, if available.
     */
    specification?: string;
    /**
     * The current visual update type from the visual host, if needed.
     */
    updateType?: VisualUpdateType;
}
