export * as advancedEditor from './advancedEditor';
export * as aria from './aria';
export * as commandBar from './commandBar';
export * as commands from './commands';
export * as dom from './dom';
export * as fluent from './fluent';
export * as i18n from './i18n';
export * as icons from './icons';
export * as labels from './labels';
export * as selectors from './selectors';
export * as svgFilter from './svgFilter';

export { getVersionInfo, resolveVisualMode, TEditorPosition, TVisualMode };

import powerbi from 'powerbi-visuals-api';
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;

import { getVisualMetadata, providerVersions } from '../../core/utils/config';
import { i18nValue } from '../../core/ui/i18n';
import { ISpecification } from '../../features/specification';

/**
 * Returns visual + Vega + Vega-Lite version information as a single string.
 */
const getVersionInfo = () => {
    const visualMetadata = getVisualMetadata();
    return `${visualMetadata.version} | ${i18nValue('Provider_Vega')}: ${
        providerVersions.vega
    } | ${i18nValue('Provider_VegaLite')}: ${providerVersions.vegaLite}`;
};

/**
 * Calculated during store update, and based on this state, determine what interface should be displayed to the end-user.
 */
const resolveVisualMode = (
    datasetViewHasValidMapping: boolean,
    editMode: EditMode,
    isInFocus: boolean,
    viewMode: ViewMode,
    spec: ISpecification
): TVisualMode => {
    switch (true) {
        case datasetViewHasValidMapping &&
            isReadWriteAdvanced(viewMode, editMode) &&
            isInFocus:
            return 'Editor';
        case isReadOnly(viewMode) && hasNoSpec(spec):
            return 'SplashReadOnly';
        case isReadWriteDefault(viewMode) &&
            datasetViewHasValidMapping &&
            hasNoSpec(spec):
            return 'DataNoSpec';
        case isReadWriteDefault(viewMode) && hasNoSpec(spec):
            return 'SplashReadWrite';
        case !hasNoSpec:
            return 'SplashInitial';
        default:
            return 'Standard';
    }
};

/**
 * Determines if the visual has no spec, for managing UI state.
 */
const hasNoSpec = (spec: ISpecification) =>
    !spec || !spec.status || spec.status === 'new';

/**
 * Logic to determine if the visual is currently in read-only mode. This is typically when being used in the Service by readers.
 */
const isReadOnly = (viewMode: ViewMode) => viewMode === ViewMode.View;

/**
 * Logic to determine if the visual is currently displayed in read/write mode (i.e. it's in Desktop, or Service + edit).
 */
const isReadWriteDefault = (viewMode: ViewMode) => viewMode === ViewMode.Edit;

/**
 * Logic to determine if the visual is currently in the Advanced Editor.
 */
const isReadWriteAdvanced = (viewMode: ViewMode, editMode: EditMode) =>
    viewMode === ViewMode.Edit && editMode === EditMode.Advanced;

/**
 * Type to allow structure of the value for position of editor within the advanced editor view.
 */
type TEditorPosition = 'left' | 'right';

/**
 * Type to allow structure of the value for type of interface we need to display to the end-user.
 */
type TVisualMode =
    | 'Standard'
    | 'Editor'
    | 'SplashReadOnly'
    | 'SplashReadWrite'
    | 'SplashInitial'
    | 'DataNoSpec';
