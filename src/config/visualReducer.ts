import powerbi from 'powerbi-visuals-api';
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;

import { IVisualSliceState } from '../types';
import VisualSettings from '../properties/VisualSettings';
import { getEmptyDataset } from '../api/dataset';
import { resolveLoaderLogic } from '../api/specification';

const visualReducer: IVisualSliceState = {
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
    fetchMoreData: null,
    fixResult: {
        success: true,
        dismissed: false,
        spec: null,
        config: null
    },
    fourd3d3d: false,
    i18n: null,
    interfaceType: 'Landing',
    isInFocus: false,
    isExportDialogVisible: false,
    isNewDialogVisible: true,
    launchUrl: null,
    loader: resolveLoaderLogic(),
    locale: '',
    persistProperties: null,
    resizablePaneDefaultWidth: null,
    resizablePaneExpandedWidth: null,
    resizablePaneWidth: null,
    selectedOperation: 'spec',
    selectionIdBuilder: null,
    selectionManager: null,
    spec: {
        status: 'new',
        spec: null,
        rawSpec: null,
        message: 'Spec has not yet been parsed'
    },
    themeColors: [],
    tooltipService: null,
    updates: 0,
    settings: <VisualSettings>VisualSettings.getDefault(),
    vegaViewport: { width: 0, height: 0 },
    viewMode: ViewMode.View,
    viewport: { width: 0, height: 0 }
};

export { visualReducer };
