import { type TemplateExportProcessingState } from '@deneb-viz/json-processing/template-processing';
import { type InterfaceMode, type ModalDialogRole } from '../lib/interface';
import { type RemapState } from '@deneb-viz/json-processing/field-tracking';

export type InterfaceSliceProperties = {
    /**
     * The current state of the export processing.
     */
    exportProcessingState: TemplateExportProcessingState;
    /**
     * Whether the visual has initialized or not. The visual is regarded
     * as initialized once the very first attempt to check the dataset has
     * been made. This is to ensure that we only start to handle mode
     * states beyond `Initializing` after this point (and prevent the UI
     * from flickering between modes during the initial constructor and
     * update events).
     */
    isInitialized: boolean;
    /**
     * Whether the spec tokenization worker is currently processing. This is used to be able to update the
     * interface accordingly when this is in progress.
     */
    isTokenizingSpec: boolean;
    /**
     * Whether the field tracking worker is currently processing fields. This is used to be able to update the
     * interface accordingly when this is in progress.
     */
    isTrackingFields: boolean;
    /**
     * The current application mode
     */
    mode: InterfaceMode;
    /**
     * Current modal dialog display role. Used to display correct dialog to
     * the user (or not at all).
     */
    modalDialogRole: ModalDialogRole;
    /**
     * The current state of the remapping process.
     */
    remapState: RemapState;
    /**
     * Unique ID representing the current render operation. Used to ensure
     * that we can trigger a re-render of the Vega view for specific
     * conditions that sit outside the obvious triggers (e.g. data
     * changes).
     */
    renderId: string;
    /**
     * Sets the export processing state.
     */
    setExportProcessingState: (state: TemplateExportProcessingState) => void;
    /**
     * Signals that we should generate a new render ID for the current
     * specification.
     */
    generateRenderId: () => void;
    /**
     * For situations where we're not ready to process data (e.g. first
     * run), then we will explicitly flag the visual as initialized and set
     * the mode to `Landing`.
     */
    setExplicitInitialize: () => void;
    /**
     * Sets the tokenization state.
     */
    setIsTokenizingSpec: (isTokenizing: boolean) => void;
    /**
     * Sets the tracking field state.
     */
    setIsTrackingFields: (isTracking: boolean) => void;
    /**
     * Sets the role of the modal dialog to display.
     */
    setModalDialogRole: (role: ModalDialogRole) => void;
    /**
     * Sets the remap state.
     */
    setRemapState: (state: RemapState) => void;
};

export interface InterfaceSlice {
    interface: InterfaceSliceProperties;
}
