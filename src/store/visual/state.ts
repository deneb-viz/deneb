export {
    IVisualSliceState,
    IVisualDatasetUpdatePayload,
    IVisualUpdatePayload,
    IEditorPaneUpdatePayload,
    initialState
};

import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;
import DataViewObjects = powerbi.DataViewObjects;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;

import { getEmptyDataset, IVisualDataset } from '../../core/data/dataset';
import { IDataViewFlags, TDataProcessingStage } from '../../core/data/dataView';
import { TEditorRole } from '../../core/services/JsonEditorServices';
import { TVisualMode } from '../../core/ui';
import { ICompiledSpec, IFixResult } from '../../core/utils/specification';
import VisualSettings from '../../properties/VisualSettings';

interface IVisualSliceState {
    allowInteractions: boolean;
    autoApply: boolean;
    canAutoApply: boolean;
    canFetchMore: boolean;
    categories: DataViewCategoryColumn[];
    dataset: IVisualDataset;
    dataProcessingStage: TDataProcessingStage;
    dataRowsLoaded: number;
    dataViewFlags: IDataViewFlags;
    dataViewObjects: DataViewObjects;
    dataWindowsLoaded: number;
    editMode: EditMode;
    editorPaneIsExpanded: boolean;
    editorPreviewAreaWidth: number;
    fourd3d3d: boolean;
    fixResult: IFixResult;
    hotkeysBound: boolean;
    isInFocus: boolean;
    isNewDialogVisible: boolean;
    isExportDialogVisible: boolean;
    isDirty: boolean;
    resizablePaneDefaultWidth: number;
    resizablePaneExpandedWidth: number;
    resizablePaneWidth: number;
    settings: VisualSettings;
    selectedOperation: TEditorRole;
    spec: ICompiledSpec;
    stagedConfig: string;
    stagedSpec: string;
    themeColors: string[];
    updates: number;
    viewModeViewport: IViewport;
    vegaViewport: IViewport;
    visualMode: TVisualMode;
    viewMode: ViewMode;
    viewport: IViewport;
}

interface IVisualDatasetUpdatePayload {
    categories: DataViewCategoryColumn[];
    dataset: IVisualDataset;
}

interface IVisualUpdatePayload {
    settings: VisualSettings;
    options: VisualUpdateOptions;
}

interface IEditorPaneUpdatePayload {
    editorPaneWidth: number;
    editorPaneExpandedWidth: number;
}

const initialState: IVisualSliceState = {
    allowInteractions: false,
    autoApply: false,
    canAutoApply: true,
    canFetchMore: false,
    categories: [],
    dataset: getEmptyDataset(),
    dataProcessingStage: 'Initial',
    dataRowsLoaded: 0,
    dataViewFlags: {
        hasValidDataRoles: false,
        hasValidDataViewMapping: false,
        hasValidDataView: false
    },
    dataViewObjects: {},
    dataWindowsLoaded: 0,
    editMode: EditMode.Default,
    editorPaneIsExpanded: true,
    editorPreviewAreaWidth: null,
    fixResult: {
        success: true,
        dismissed: false,
        spec: null,
        config: null
    },
    fourd3d3d: false,
    hotkeysBound: false,
    isInFocus: false,
    isDirty: false,
    isExportDialogVisible: false,
    isNewDialogVisible: true,
    resizablePaneDefaultWidth: null,
    resizablePaneExpandedWidth: null,
    resizablePaneWidth: null,
    selectedOperation: 'spec',
    spec: {
        status: 'new',
        spec: null,
        rawSpec: null,
        message: 'Spec has not yet been parsed'
    },
    stagedConfig: null,
    stagedSpec: null,
    themeColors: [],
    updates: 0,
    settings: <VisualSettings>VisualSettings.getDefault(),
    vegaViewport: { width: 0, height: 0 },
    viewMode: ViewMode.View,
    viewModeViewport: { width: 0, height: 0 },
    viewport: { width: 0, height: 0 },
    visualMode: 'SplashInitial'
};
