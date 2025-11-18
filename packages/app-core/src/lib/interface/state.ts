import {
    DEFAULTS,
    VisualFormattingSettingsModel
} from '@deneb-viz/powerbi-compat/properties';
import {
    isAdvancedEditor,
    isVisualUpdateTypeData,
    isVisualUpdateTypeResize,
    isVisualUpdateTypeResizeEnd
} from '@deneb-viz/powerbi-compat/visual-host';
import { logDebug } from '@deneb-viz/utils/logging';
import {
    InterfaceModeResolutionParameters,
    type InterfaceMode,
    type ModalDialogRole
} from './types';

/**
 * For the supplied parameters, resolve what the application mode should be. This will be the main interface that the
 * user will interact with. Some of these will be purely informative (e.g. landing pages and loading messages), but the
 * main distinctions will be whether the visual should display the configured spec for readers (`View`) or whether the
 * editing interface should be presented for further customization (`Edit`).
 */
export const getApplicationMode = (
    parameters: InterfaceModeResolutionParameters
): InterfaceMode => {
    if (parameters.invokeMode !== undefined) {
        logDebug(`explicitly setting mode to '${parameters.invokeMode}'`);
        return parameters.invokeMode;
    }
    const datasetValid =
        Object.keys(parameters.dataset?.fields ?? {})?.length > 0;
    const isEditor = isEligibleForEditor(parameters);
    logDebug('Resulting mode flag test results', { isEditor, datasetValid });
    switch (true) {
        case isEditor && !datasetValid:
            return 'EditorNoData';
        case isEditor:
            return 'Editor';
        case !isEditor && datasetValid && !parameters.specification:
            return 'NoSpec';
        case !isEditor &&
            datasetValid &&
            parameters.specification != DEFAULTS.vega.jsonSpec &&
            true:
            return 'View';
        default:
            return parameters.currentMode ?? 'Landing';
    }
};

/**
 * We need to ensure that the editor's 'Create' dialog role is set/checked in a few places, so that we can ensure the
 * dialog is displayed to onboard the user when necessary. This handles the common logic for assessing whether it
 * should be displayed or the existing state continued to be used.
 */
export const getModalDialogRole = (
    settings: VisualFormattingSettingsModel,
    visualViewMode: InterfaceMode,
    currentDialogRole: ModalDialogRole
) =>
    settings?.vega?.state?.isNewDialogOpen?.value && visualViewMode === 'Editor'
        ? 'Create'
        : currentDialogRole;

/**
 * Tests that for the supplied parameters, that the editor interface should be
 * displayed for the user.
 */
const isEligibleForEditor = (parameters: InterfaceModeResolutionParameters) => {
    try {
        logDebug('isEligibleForEditor parameters', parameters);
        const { editMode, isInFocus = false } = parameters;
        const isEditorViewport = isAdvancedEditor(editMode, isInFocus);
        logDebug('isEligibleForEditor isEditorViewport', isEditorViewport);
        switch (true) {
            /**
             * Keep a previous editor state active for subsequent updates.
             */
            case isEditorViewport &&
                (parameters.prevMode === 'Editor' ||
                    parameters.prevMode === 'EditorNoData'):
                return true;
            /**
             * Visual is opened in an advanced editor state (e.g., switching to the
             * visual from another Deneb visual GUID. where the editor was open).
             */
            case isEditorViewport && parameters.visualUpdates === 1:
                return true;
            /**
             * Edit mode is invoked from the report canvas by the user. In this
             * case, the visual host does 4 successive updates and the one at
             * the point of switching over to the advanced editor doesn't have
             * the correct viewport dimensions. It would understandably be
             * better if we didn't have this situation, but we can check for
             * consecutive types that we know will result in the correct 'full
             * screen' viewport size and use them as our condition.
             */
            case isEditorViewport &&
                isVisualUpdateTypeResize(parameters.updateType) &&
                isVisualUpdateTypeResizeEnd(parameters.prevUpdateType):
                return true;
            /**
             * We're in the advanced editor state and the visual host has finished
             * sending data.
             */
            case isEditorViewport &&
                isVisualUpdateTypeData(parameters.updateType):
                return true;
            default:
                return false;
        }
    } catch (e) {
        logDebug('isEligibleForEditor ERROR', e);
        return false;
    }
};
