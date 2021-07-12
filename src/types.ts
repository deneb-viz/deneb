import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;
import DataViewObjects = powerbi.DataViewObjects;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

import { Loader } from 'vega';

import VisualSettings from './properties/VisualSettings';
import { IVisualDataset } from './api/dataset';
import { IDataViewFlags, TDataProcessingStage } from './api/dataView';
import { TEditorRole } from './api/editor';
import { TVisualMode } from './api/ui';
import { ICompiledSpec, IFixResult } from './api/specification';

/**
 * ========
 * Services
 * ========
 */

/**
 * API to handle signals from a Vega/Vega-Lite view and convert any elegible data point logic into suitable Power BI selection
 * operations.
 */
export interface ISelectionHandlerService {
    /**
     * For a selection event within the visual, attempt to resolve any eligible data points and broker their state with the
     * Power BI selection manager's `select` method.
     *
     * @param name - name of triggered selection from Vega view.
     * @param selection - array of selected data from Vega view.
     */
    handleDataPoint: (name: string, selection: any) => void;
    /**
     * For a contextmenu (right-click) event within the visual, attempt to resolve any eligible data points and broker their
     *  state with the Power BI selection manager's `showContextMenu` method.
     *
     * @param name - name of triggered selection from Vega view.
     * @param selection - array of selected data from Vega view.
     */
    handleContextMenu: (name: string, selection: any) => void;
}

/**
 * ===========
 * Redux store
 * ===========
 */

/**
 * Visual reducer state
 */
export interface IVisualSliceState {
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
    fourd3d3d: boolean;
    fixResult: IFixResult;
    isInFocus: boolean;
    isNewDialogVisible: boolean;
    isExportDialogVisible: boolean;
    isDirty: boolean;
    loader: Loader;
    locale: string;
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
    vegaViewport: IViewport;
    visualMode: TVisualMode;
    viewMode: ViewMode;
    viewport: IViewport;
}
