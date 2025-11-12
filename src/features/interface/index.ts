import powerbi from 'powerbi-visuals-api';
import EditMode = powerbi.EditMode;
import ViewMode = powerbi.ViewMode;
import VisualUpdateType = powerbi.VisualUpdateType;
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import {
    POPOVER_Z_INDEX,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE
} from '../../constants';

import {
    IInterfaceModeResolutionParameters,
    IVisualUpdateHistoryRecord,
    InterfaceMode
} from './types';
import { logDebug } from '../logging';
import { getState } from '../../store';
import {
    isVisualUpdateTypeResize,
    isVisualUpdateTypeResizeEnd
} from '../visual-host';
import { DEFAULTS } from '@deneb-viz/powerbi-compat/properties';

/**
 * UI theming utilities.
 */
export * as Themes from './theme';
export { AdvancedEditor } from './components/advanced-editor';
export { CappedTextField } from './components/capped-text-field';
export { Hyperlink } from './components/hyperlink';
export { StatusBarContainer } from './components/status-bar-container';
export { TooltipCustomMount } from './components/tooltip-custom-mount';
export { VisualInterface } from './components/visual-interface';
export * from './types';

export type InterfaceTheme = 'light' | 'dark';

export const useInterfaceStyles = makeStyles({
    container: {
        boxSizing: 'border-box',
        height: '100%',
        width: '100%',
        cursor: 'auto',
        '& .editor-heading': {
            cursor: 'pointer'
        },
        ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2)
    },
    editorContainer: {
        height: '100%',
        maxHeight: '100%',
        maxWidth: '100%',
        width: '100%',
        ...shorthands.overflow('hidden')
    },
    statusBarContainer: {
        boxSizing: 'border-box',
        flexShrink: 0,
        width: '100%',
        height: `${PREVIEW_PANE_TOOLBAR_MIN_SIZE}px}`,
        borderTopColor: tokens.colorNeutralStroke2,
        borderTopStyle: 'solid',
        borderTopWidth: '1px',
        ...shorthands.overflow('hidden')
    },
    tooltipMount: {
        zIndex: POPOVER_Z_INDEX
    },
    themeBackground: {
        backgroundColor: tokens.colorNeutralBackground1
    },
    visualBackground: {
        backgroundColor: 'transparent'
    }
});

/**
 * For the supplied parameters, resolve what the application mode should be.
 * This will be the main interface that the user will interact with. Some of
 * these  will be purely informative (e.g. landing pages and loading messages),
 * but the main distinctions will be whether the visual should disply the
 * configured spec for readers (`View`) or whether the editing interface should
 * be presented for further customization (`Edit`).
 */
export const getApplicationMode = (
    parameters: IInterfaceModeResolutionParameters
): InterfaceMode => {
    logDebug('getApplicationMode', parameters);
    if (parameters.invokeMode !== undefined) {
        logDebug(`explicitly setting mode to '${parameters.invokeMode}'`);
        return parameters.invokeMode;
    }
    const datasetValid = Object.keys(parameters.dataset?.fields)?.length > 0;
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
 * When moving our visual from the canvas to the advanced editor, the visual
 * viewport gets out of sequence and can cause issues with our UI calculations.
 * This does the necessary checks against the update history and retrieves the
 * correct dimensions as necessary.
 */
export const getCorrectViewport = (history: IVisualUpdateHistoryRecord[]) => {
    if (
        isVisualUpdateTypeResize(history?.[0]?.type) &&
        isVisualUpdateTypeResizeEnd(history?.[1]?.type) &&
        history[0].isInFocus &&
        history[0].viewMode === ViewMode.Edit &&
        history[0].editMode === EditMode.Advanced
    ) {
        return history[1].viewport;
    }
    return history[0].viewport;
};

/**
 * Tests that for the supplied parameters, that the editor interface should be
 * displayed for the user.
 */
const isEligibleForEditor = (
    parameters: IInterfaceModeResolutionParameters
) => {
    try {
        switch (true) {
            /**
             * Keep a previous editor state active for subsequent updates.
             */
            case isEditorViewport(parameters) &&
                (getState().interface.mode === 'Editor' ||
                    getState().interface.mode === 'EditorNoData'):
                return true;
            /**
             * Visual is opened in an advanced editor state (e.g., switching to the
             * visual from another Deneb visual GUID. where the editor was open).
             */
            case isEditorViewport(parameters) && getState().visualUpdates === 1:
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
            case isEditorViewport(parameters) &&
                isVisualUpdateTypeResize(parameters.updateType) &&
                isVisualUpdateTypeResizeEnd(
                    getState().visualUpdateOptions?.type
                ):
                return true;
            /**
             * We're in the advanced editor state and the visual host has finished
             * sending data.
             */
            case isEditorViewport(parameters) &&
                parameters.updateType === VisualUpdateType.Data:
                return true;
            default:
                return false;
        }
    } catch (e) {
        logDebug('isEligibleForEditor ERROR', e);
        return false;
    }
};

/**
 * Test that the supplied parameters mean that the visual host has the visual
 * in a suitable state to display the editor interface.
 */
const isEditorViewport = (parameters: IInterfaceModeResolutionParameters) =>
    parameters.editMode === EditMode.Advanced && parameters.isInFocus;

/**
 * Confirms that specified events are not occurring in the advanced editor UI
 * and the JSON editor can have focus set to it (or other similar actions).
 */
export const shouldPrioritizeJsonEditor = () => {
    const {
        interface: { modalDialogRole }
    } = getState();
    const isPopover = modalDialogRole !== 'None';
    return !isPopover;
};
