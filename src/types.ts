import powerbi from 'powerbi-visuals-api';
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DataView = powerbi.DataView;
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import DataViewCategorical = powerbi.DataViewCategorical;
import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;
import ISelectionId = powerbi.visuals.ISelectionId;
import ITooltipService = powerbi.extensibility.ITooltipService;
import IViewport = powerbi.IViewport;
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;
import DataViewObjects = powerbi.DataViewObjects;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import VisualObjectInstancesToPersist = powerbi.VisualObjectInstancesToPersist;
import DataViewPropertyValue = powerbi.DataViewPropertyValue;
import ValueTypeDescriptor = powerbi.ValueTypeDescriptor;
import DataViewCategoryColumn = powerbi.DataViewCategoryColumn;

import JSONEditor from 'jsoneditor';
import { TopLevelSpec } from 'vega-lite';
import { Config, Spec, TooltipHandler, Loader } from 'vega';
import { Options } from 'react-hotkeys-hook';

import VisualSettings from './properties/VisualSettings';
import DataLimitSettings from './properties/DataLimitSettings';
import {
    ITemplateDatasetField,
    IDenebTemplateMetadata,
    TDatasetFieldType
} from './schema/template-v1';
import { ErrorObject } from 'ajv';
import { IVisualDataset } from './api/dataset';

/**
 * =====
 * Types
 * =====
 */

// Used to constrain Vega rendering to supported types.
export type TSpecRenderMode = 'svg' | 'canvas';
// Used to constrain spec providers to supported types.
export type TSpecProvider = 'vega' | 'vegaLite';
// Used for creating a new specification - can either be from existing templates, or imported
export type TTemplateProvider = TSpecProvider | 'import';
// USed to handle which export operation we currently have open
export type TExportOperation = 'information' | 'dataset' | 'template';
// Used to specify the types of operatons we should have within the pivot control in the editor pane.
export type TEditorOperation = 'spec' | 'config' | 'settings';
// Specify the start or end of a console group for the `Debugger`.
export type TDebugMethodMarkerExtent = 'start' | 'end';
// The types of interface we need to render within the visual.
export type TVisualInterface = 'Landing' | 'View' | 'Edit';
// Position of editor within the interface
export type TEditorPosition = 'left' | 'right';
// Modal dialog type (used for specific ops handling)
export type TModalDialogType = 'new' | 'export';
// Stages to within the store when processing data, and therefore give us some UI hooks for the end-user.
export type TDataProcessingStage =
    | 'Initial'
    | 'Fetching'
    | 'Processing'
    | 'Processed';
// Stages we go through when importing a template so that the interface can respond accordingly.
export type TTemplateImportState =
    | 'None'
    | 'Supplied'
    | 'Loading'
    | 'Validating'
    | 'Success'
    | 'Error';
// Stages we go through when exporting a template so that the interface can respond accordingly.
export type TTemplateExportState =
    | 'None'
    | 'Validating'
    | 'Editing'
    | 'Success'
    | 'Error';
// Template type constraints for placeholders (currently not used).
export type TSupportedValueTypeDescriptor =
    | 'text'
    | 'numeric'
    | 'integer'
    | 'bool'
    | 'dateTime'
    | 'duration'
    | 'binary';
// Locales (currently for debugging only)
export type TLocale = 'en-US' | 'de-DE' | 'fr-FR';

/**
 * ========
 * Services
 * ========
 */

/**
 * API for menu and keyboard commands within the visual.
 */
export interface ICommandService {
    /**
     * Handle the change in provider from one to the other and update necessary store dependencies and properties.
     */
    updateProvider: (provider: TSpecProvider) => void;
    /**
     * Handle the change in render mode from one to the other and update necessary store dependencies and properties.
     */
    updateRenderMode: (renderMode: TSpecRenderMode) => void;
    /**
     * Generic handler for a boolean (checkbox) property in the settings pane.
     */
    updateBooleanProperty: (name: string, value: boolean) => void;
    /**
     * Handle the Apply Changes command.
     */
    applyChanges: () => void;
    /**
     * Handle the Toggle Auto Apply command.
     */
    toggleAutoApply: () => void;
    /**
     * Hande the show/hide of the editor pane.
     */
    toggleEditorPane: () => void;
    /**
     * Handle the Repair/Format JSON command.
     */
    repairFormatJson: () => void;
    /**
     * Handle the Generate JSON Template command.
     */
    createExportableTemplate: () => void;
    /**
     * Handle the Create New Spec command.
     */
    createNewSpec: () => void;
    /**
     * Handle the necessary logic required to close down a modal dialog.
     */
    closeModalDialog: (type: TModalDialogType) => void;
    /**
     * Handle the Get Help command.
     */
    openHelpSite: () => void;
    /**
     * Open a specific pivot item from the editor.
     */
    openEditorPivotItem: (operation: TEditorOperation) => void;
}

/**
 * API for working with the visual data view and structing data for use.
 */
export interface IDataViewService {
    /**
     * Ensures an empty dataset is made available.
     */
    getEmptyDataset: () => IVisualDataset;
    /**
     * Checks for valid dataview and provides count of values.
     */
    getRowCount: (categorical: DataViewCategorical) => number;
    /**
     * Validates the data view, to confirm that we can get past the splash screen.
     *
     * @param dataViews - Visual dataView from update.
     */
    validateDataViewRoles: (
        dataViews?: DataView[],
        dataRoles?: string[]
    ) => boolean;
    /**
     * Processes the data in the visual's data view into an object suitable for the visual's API.
     *
     * @param table - table data from visual data view.
     * @param selectionIdBuilder - instance of builder, used for creating selection ID for each table row.
     */
    getMappedDataset: (categorical: DataViewCategorical) => IVisualDataset;
    /**
     * Validates the data view, to confirm that we can get past the spash screen
     *
     * @param dataViews - visual dataView from update options.
     */
    validateDataViewMapping: (dataViews: DataView[]) => boolean;
}

/**
 * API to handle all logic around fetching more data from the data model, if needed.
 */
export interface IDataLoadingService {
    /**
     * Look at the data limit settings and data view, and carry out additional loading of data if required.
     *
     * @param options - visual update options.
     * @param settings - the current properties from the visual, to determine what additional loading should be
     *  carried out (if any).
     * @param host - visual host services (for calling `fetchMoreData`).
     */
    handleDataFetch: (
        options: VisualUpdateOptions,
        settings: DataLimitSettings,
        host: IVisualHost
    ) => void;
}

/**
 * API for instnantiating and maintaining visual JSON editors.
 */
export interface IEditorService {
    /**
     * Creates instance of JSONEditor in the specified container.
     */
    createEditor: (container: HTMLDivElement) => void;
    /**
     * Ensures that the current editor's schema validation is correct, based on mode and provider.
     */
    setProviderSchema: () => void;
    /**
     * Ensure editor is resized correctly for container (typically needs to be called when the pane
     * is resized, so that wrapping etc. is as expected).
     */
    resize: () => void;
    /**
     * Ensure the specified editor gets focus (typically required after the user has clicked a
     * button on the command bar, or some other external task has been carried out).
     */
    focus: () => void;
    /**
     * Ensure that editor completers are updated/synced to match anything the user has added to
     * (or removed from) the Values data role.
     */
    updateCompleters: () => void;
    /**
     * Gets the current text from the embedded Ace editor with JSONEditor.
     */
    getText: () => void;
    /**
     * Sets the embedd Ace editor text within JSONEditor (using the JSONEditor method removes
     * undo from the embedded editor, so we want to ensure we have sensible encapsulation to
     * prevent this as much as possible).
     */
    setText: (text: string) => void;
}

/**
 * API for managing visual property consistency/persistence.
 */
export interface IPropertyService {
    /**
     * Instance of `persistProperties` method, from visual host services.
     */
    persistProperties: (changes: VisualObjectInstancesToPersist) => void;
    /**
     * Handles resolution of object properties from the data view, either for persistence.
     *
     * @param objectName - the name of the object to work with
     * @param properties - array of property names and optional values to persist to the data view. If a value
     *  is not supplied, the default value will be retrieved from the `VisualSettings` for the supplied name.
     */
    resolveObjectProperties: (
        objectName: string,
        properties: {
            name: string;
            value?: DataViewPropertyValue;
        }[]
    ) => VisualObjectInstancesToPersist;
    /**
     * Manage persistence of content to the visual's dataView objects.
     *
     * @param changes   - changes to apply to the dataView.
     */
    updateObjectProperties: (changes: VisualObjectInstancesToPersist) => void;
}

/**
 * API for managing interface and sizing within the visual.
 */
export interface IRenderingService {
    /**
     * Based on the state of the store, determine what interface should be displayed to the end-user.
     *
     * @param state - the current visual (store) state for inspection.
     */
    resolveInterfaceType: (state: IVisualSliceState) => TVisualInterface;
    /**
     * Calculate the default size of the resizable pane (in px) based on current viewport size and config defaults.
     *
     * @param viewport - current visual viewport dimensions.
     * @param position - current editor position.
     */
    getResizablePaneDefaultWidth: (
        viewport: IViewport,
        position: TEditorPosition
    ) => number;
    /**
     * Based on the current state of the resizable pane, resolve its actual width on the screen.
     *
     * @param paneExpandedWidth - current width of the expanded resizable pane.
     * @param editorPaneIsExpanded - flag confirming whether editor pane is expanded or collapsed.
     * @param viewport - current visual viewport dimensions.
     * @param position - current editor position.
     */
    getResizablePaneSize: (
        paneExpandedWidth: number,
        editorPaneIsExpanded: boolean,
        viewport: IViewport,
        position: TEditorPosition
    ) => number;
    /**
     * Work out what the minimum size of the resizable pane should be (in px), based on the persisted visual (store) state.
     */
    getResizablePaneMinSize: () => number;
    /**
     * Work out what the maximum size of the resizable pane should be (in px), based on the persisted visual (store) state.
     */
    getResizablePaneMaxSize: () => number;
    /**
     * Calculate the dimensions of the Vega/Vega-Lite visual viewport (height/width) based on the interface state and a number
     * of other factors (including any config defaults).
     *
     * @param viewport - current visual viewport dimensions.
     * @param paneWidth - current width of resizable pane.
     * @param interfaceType - the current interface the visual is displaying for the end user.
     * @param position - current editor position.
     */
    calculateVegaViewport: (
        viewport: IViewport,
        paneWidth: number,
        interfaceType: TVisualInterface,
        position: TEditorPosition
    ) => IViewport;
}

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
    /**
     * We have some compatibility issues between `powerbi.extensibility.ISelectionId` and `powerbi.visuals.ISelectionId`,
     * as well as needing to coerce Selection IDs to strings so that we can set intial selections for Vega-Lite (as objects
     * aren't supported). This consolidates the logic we're using to resolve a Selection ID to a string for use across the
     * visual.
     *
     * @param id - the selection ID we wish to stringify.
     */
    getSidString: (id: ISelectionId) => string;
}

/**
 * API to handle operations are specification parsing and persistence.
 */
export interface ISpecificationHandlerService {
    /**
     * Create a custom Vega loader for the visual. The intention was to ensure that we could use this to disable loading of external
     * content, but it worked for data but not for images. This is essentially a stub, but I'm leaving here in case I can make it
     * work the correct way in future.
     */
    resolveLoaderLogic: () => Loader;
    /**
     * Take user input (specification and configuration), apply any specified integration features to them (such as selection
     * and context menu) and attempt to parse as a valid Vega or Vega-Lite spec for rendering later on.
     */
    parseActiveSpec: () => void;
    /**
     * Resolve the spec/config and pass to the `PropertyService` for persistence.
     */
    persist: () => void;
    /**
     * For the supplied object, convert to string and indent according to specified tab size.
     *
     * @param json - object to beautify.
     */
    indentJson: (json: object) => string;
    /**
     * For the supplied provider and template, add this to the visual and persist to properties, ready for subsequent editing.
     *
     * @param provider - specified provider (Vega/Vega-Lite).
     * @param template - the template to use for creation.
     */
    createFromTemplate: (
        provider: TSpecProvider,
        template: Spec | TopLevelSpec
    ) => void;
    /**
     * For the specification and configuration in each editor, attempt to fix any simple issues that might prevent it from being
     * valid JSON. We'll also indent it if valid. If it doesn't work, we'll update the store with the error details so that we
     * can inform the user to take action.
     */
    fixAndFormat: () => void;
    /**
     * Retrieves the config from our visual properties, and enriches it with anything we want to abstract out from the end-user
     * to make things as "at home" in Power BI as possible.
     */
    getInitialConfig: () => void;
    /**
     * Gets the `config` from our visual objects and parses it to JSON.
     */
    getParsedConfigFromSettings: () => Config;
    /**
     * Apply any custom expressions that we have written (e.g. formatting) to the specification prior to rendering.
     */
    registerCustomExpressions: () => void;
    /**
     * For the supplied spec, parse it to determine which provider we should use when importing it (precedence is Vega-Lite),
     * and will then fall-back to Vega if VL is not valid.
     *
     * @param spec - specification to analyse
     */
    determineProviderFromSpec: (spec: Spec | TopLevelSpec) => TSpecProvider;
}

/**
 * API to handle operations around visual template operations.
 */
export interface ITemplateService {
    /**
     * For a supplied template, substitute placeholder values and return a stringified representation of the object.
     */
    getReplacedTemplate: (template: Spec | TopLevelSpec) => string;
    /**
     * Enumerate a template's placeholders and confirm they all have values supplied by the user. If a template doesn't have any
     * placeholders then this will also be regarded as fulfilled.
     *
     * @param template - the template object to inspect.
     */
    getPlaceholderResolutionStatus: (template: Spec | TopLevelSpec) => boolean;
    /**
     * Supply assistive text to a placeholder, based on whether it allows columns, measures or both.
     *
     * @param placeholder - the placeholder to interrogate.
     */
    getPlaceholderDropdownText: (datasetField: ITemplateDatasetField) => string;
    /**
     * Attempt to load the selected template JSON file and validate it.
     *
     * @param files - the `FileList` object to attempt load from.
     */
    handleFileSelect: (files: FileList) => void;
    /**
     * For a given column or measure (or template placeholder), resolve the UI icon for its data type.
     *
     * @param type - the data type to resolve.
     */
    resolveTypeIcon: (type: TDatasetFieldType) => string;
    /**
     * For a given column or measure (or template placeholder), resolve the UI tooltip/title text for its data type.
     *
     * @param type - the data type to resolve.
     */
    resolveTypeIconTitle: (type: TDatasetFieldType) => string;
    /**
     * For a given column or measure (or template placeholder), resolve its type against the Power BI value descriptor.
     *
     * @param type - the data type to resolve.
     */
    resolveValueDescriptor: (type: ValueTypeDescriptor) => TDatasetFieldType;
    /**
     * Checks to see if current spec is valid and updates store state for UI accordingly.
     */
    validateSpecificationForExport: () => void;
    /**
     * For a given `DataViewMetadataColumn`, produces a new `ITemplateDatasetField` object that can be used for templating
     * purposes.
     *
     * @param metadata data view column to map
     */
    resolveVisualMetaToDatasetField: (
        metadata: DataViewMetadataColumn
    ) => ITemplateDatasetField;
    /**
     * Combines spec, config and specified metadata to produce a valid JSON template for export.
     */
    getExportTemplate: () => string;
    /**
     * Instantiates a new object for export template metadata, ready for population.
     */
    newExportTemplateMetadata: () => IDenebTemplateMetadata;
}

/**
 * Custom implementation of a Vega tooltip handler, to manage Power BI tooltip operations for enabled views.
 */
export interface ITooltipHandlerService {
    /**
     * The handler function. We bind this to this function in the constructor.
     */
    call: TooltipHandler;
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
    i18n: ILocalizationManager;
    interfaceType: TVisualInterface;
    isInFocus: boolean;
    isNewDialogVisible: boolean;
    isExportDialogVisible: boolean;
    launchUrl: (url: string) => void;
    loader: Loader;
    locale: string;
    resizablePaneDefaultWidth: number;
    resizablePaneExpandedWidth: number;
    resizablePaneWidth: number;
    settings: VisualSettings;
    selectedOperation: TEditorOperation;
    selectionIdBuilder: () => ISelectionIdBuilder;
    selectionManager: ISelectionManager;
    spec: ICompiledSpec;
    themeColors: string[];
    tooltipService: ITooltipService;
    updates: number;
    vegaViewport: IViewport;
    viewMode: ViewMode;
    viewport: IViewport;
}

/**
 * Template reducer state
 */
export interface ITemplateSliceState {
    selectedTemplateIndex: number;
    templateFile: File;
    templateImportState: TTemplateImportState;
    templateExportState: TTemplateExportState;
    templateImportErrorMessage: string;
    templateExportErrorMessage: string;
    templateSchemaErrors: ErrorObject[];
    templateFileRawContent: string;
    templateToApply: Spec | TopLevelSpec;
    templateExportMetadata: IDenebTemplateMetadata;
    allImportCriteriaApplied: boolean;
    allExportCriteriaApplied: boolean;
    templateProvider: TTemplateProvider;
    specProvider: TSpecProvider;
    selectedExportOperation: TExportOperation;
    vegaLite: TopLevelSpec[];
    vega: Spec[];
}

// Action Payloads...
export interface IVisualDatasetUpdatePayload {
    categories: DataViewCategoryColumn[];
    dataset: IVisualDataset;
}

export interface ISpecDataPlaceHolderDropdownProps {
    datasetField: ITemplateDatasetField;
}

export interface IPlaceholderValuePayload {
    key: string;
    objectName: string;
}

export interface IDataViewFlags {
    hasValidDataViewMapping: boolean;
    hasValidDataRoles: boolean;
    hasValidDataView: boolean;
}

export interface IVisualUpdatePayload {
    settings: VisualSettings;
    options: VisualUpdateOptions;
}

export interface IEditorPaneUpdatePayload {
    editorPaneWidth: number;
    editorPaneExpandedWidth: number;
}

export interface IFixPayload {
    status: IFixStatus;
    rawSpec: string;
    rawConfig: string;
}

export interface IEditorReferencePayload {
    role: TEditorOperation;
    editor: JSONEditor;
}

export interface ITemplateImportPayload {
    templateFile: File;
    templateFileRawContent: string;
    templateToApply: Spec | TopLevelSpec;
    provider?: TSpecProvider;
}

export interface ITemplateImportErrorPayload {
    templateImportErrorMessage: string;
    templateSchemaErrors: ErrorObject[];
}

export interface ITemplateExportFieldUpdatePayload {
    selector: string;
    value: string;
}



export interface IKeyboardShortcut {
    keys: string;
    command: () => void;
    options: Options;
}

export interface ICompiledSpec {
    status: 'valid' | 'error' | 'new';
    spec: object;
    rawSpec: string;
    message?: string;
}

export interface IFixResult {
    spec: IFixStatus;
    config: IFixStatus;
    success: boolean;
    dismissed: boolean;
    error?: string;
}

export interface IFixStatus {
    success: boolean;
    text: string;
    error?: string;
}

export interface IDebugLogOptions {
    owner?: string;
    profile?: boolean;
    report?: boolean;
}

export interface IDebugProfileDetail {
    owner: string;
    methodName: string;
    duration: number;
}

export interface IEditorProps {
    operation: TEditorOperation;
    isDialogOpen: boolean;
}

export interface IUiBaseProps {
    i18n: ILocalizationManager;
}

export interface ISpecificationErrorProps extends IUiBaseProps {
    error: string;
}

export interface IDataFetchingProps extends IUiBaseProps {
    dataRowsLoaded: number;
    dataLimit: DataLimitSettings;
}

export interface IModalDialogProps {
    type: TModalDialogType;
    visible: boolean;
}

export interface IModalHeaderProps {
    type: TModalDialogType;
}
export interface IProgressProps {
    description: string;
}

export interface IDataFieldLabelProps {
    datasetField: ITemplateDatasetField;
}

export interface IFieldInfoIconProps {
    description: string;
}

export interface ICappedTextFieldProps {
    id: string;
    i18nLabel: string;
    i18nPlaceholder: string;
    i18nAssistiveText?: string;
    maxLength: number;
    multiline?: boolean;
    inline?: boolean;
    description?: string;
}

export interface ILocaleConfiguration {
    default: string;
    format: ILocaleFormatConfiguration;
    timeFormat: ILocaleTimeConfiguration;
}

export interface ILocaleFormatConfiguration {
    [key: string]: Record<string, unknown>;
}

export interface ILocaleTimeConfiguration {
    [key: string]: Record<string, unknown>;
}
