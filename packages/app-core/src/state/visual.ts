import {
    getVisualFormattingModel,
    VisualFormattingSettingsModel
} from '@deneb-viz/powerbi-compat/properties';
import {
    type ExportSpecCommandTestOptions,
    isExportSpecCommandEnabled,
    isZoomInCommandEnabled,
    isZoomOtherCommandsEnabled,
    isZoomOutCommandEnabled,
    type ZoomLevelCommandTestOptions,
    type ZoomOtherCommandTestOptions
} from '../lib';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { getUpdatedExportMetadata } from '@deneb-viz/json-processing';
import { getParsedSpec } from '@deneb-viz/json-processing/spec-processing';
import { getSpecificationParseOptions } from './helpers';
import { type StoreState } from './state';
import { logDebug } from '@deneb-viz/utils/logging';
import { type UsermetaTemplate } from '@deneb-viz/template-usermeta';
import { type StateCreator } from 'zustand';
import { type SelectionMode } from '@deneb-viz/powerbi-compat/interactivity';
import { getModalDialogRole } from '../lib/interface/state';

export type VisualSlice = {
    visualSettings: VisualFormattingSettingsModel;
    setVisualUpdate: (payload: VisualUpdatePayload) => void;
};

export type VisualUpdatePayload = {
    settings: VisualFormattingSettingsModel;
};

export const createVisualSlice =
    (): StateCreator<
        StoreState,
        [['zustand/devtools', never]],
        [],
        VisualSlice
    > =>
    (set) => ({
        visualSettings: getVisualFormattingModel(),
        setVisualUpdate: (payload) =>
            set(
                (state) => handleSetVisualUpdate(state, payload),
                false,
                'setVisualUpdate'
            )
    });

// eslint-disable-next-line max-lines-per-function
const handleSetVisualUpdate = (
    state: StoreState,
    payload: VisualUpdatePayload
): Partial<StoreState> => {
    logDebug('setVisualUpdate', payload);
    const specOptions = getSpecificationParseOptions(state);
    const spec =
        payload.settings.vega.output.jsonSpec.value !==
        state.visualSettings.vega.output.jsonSpec.value
            ? getParsedSpec(state.specification, specOptions, {
                  ...specOptions,
                  ...{
                      config: payload.settings.vega.output.jsonConfig.value,
                      logLevel: state.project.logLevel,
                      provider: <SpecProvider>state.project.provider,
                      spec: payload.settings.vega.output.jsonSpec.value,
                      viewportHeight: state.interface.viewport?.height ?? 0,
                      viewportWidth: state.interface.viewport?.width ?? 0
                  }
              })
            : state.specification;
    const modalDialogRole = getModalDialogRole(
        state.project.__isInitialized__,
        state.interface.type,
        state.interface.modalDialogRole
    );
    const zoomOtherCommandTest: ZoomOtherCommandTestOptions = {
        specification: spec
    };
    const zoomLevelCommandTest: ZoomLevelCommandTestOptions = {
        value: state.editorZoomLevel,
        specification: spec
    };
    const exportSpecCommandTest: ExportSpecCommandTestOptions = {
        editorIsDirty:
            (state.editor.stagedSpec !== null &&
                state.editor.stagedSpec !== state.project.spec) ||
            (state.editor.stagedConfig !== null &&
                state.editor.stagedConfig !== state.project.config),
        specification: spec
    };
    const exportMetadata = getUpdatedExportMetadata(
        state.export.metadata as UsermetaTemplate,
        {
            config:
                state.specification.status === 'valid'
                    ? payload.settings.vega.output.jsonConfig.value
                    : state.export.metadata?.config,
            provider: state.project.provider as SpecProvider,
            providerVersion: state.project.providerVersion,
            interactivity: {
                tooltip:
                    payload.settings.vega.interactivity.enableTooltips.value,
                contextMenu:
                    payload.settings.vega.interactivity.enableContextMenu.value,
                selection:
                    payload.settings.vega.interactivity.enableSelection.value,
                selectionMode: payload.settings.vega.interactivity.selectionMode
                    .value as SelectionMode,
                highlight:
                    payload.settings.vega.interactivity.enableHighlight.value,
                dataPointLimit:
                    payload.settings.vega.interactivity.selectionMaxDataPoints
                        .value
            }
        }
    );
    return {
        commands: {
            ...state.commands,
            exportSpecification: isExportSpecCommandEnabled(
                exportSpecCommandTest
            ),
            zoomFit: isZoomOtherCommandsEnabled(zoomOtherCommandTest),
            zoomIn: isZoomInCommandEnabled(zoomLevelCommandTest),
            zoomOut: isZoomOutCommandEnabled(zoomLevelCommandTest),
            zoomReset: isZoomOtherCommandsEnabled(zoomLevelCommandTest)
        },
        debug: { ...state.debug, logAttention: spec.errors.length > 0 },
        export: {
            ...state.export,
            metadata: exportMetadata
        },
        interface: {
            ...state.interface,
            modalDialogRole
        },
        specification: {
            ...state.specification,
            ...spec
        },
        visualSettings: payload.settings
    };
};
