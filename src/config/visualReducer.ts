import powerbi from 'powerbi-visuals-api';
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;

import { IVisualSliceState } from '../types';
import VisualSettings from '../properties/VisualSettings';
import { dataViewService, specificationService } from '../services';

const visualReducer: IVisualSliceState = {
    allowInteractions: false,
    autoApply: false,
    canAutoApply: true,
    dataset: dataViewService.getEmptyDataset(),
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
    isNewDialogVisible: true,
    launchUrl: null,
    loader: specificationService.resolveLoaderLogic(),
    locale: '',
    resizablePaneDefaultWidth: null,
    resizablePaneExpandedWidth: null,
    resizablePaneWidth: null,
    selectedOperation: 'spec',
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
