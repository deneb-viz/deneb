export {
    calculateVegaViewport,
    getCommandBarEditCommands,
    getCommandBarFarCommands,
    getResizablePaneDefaultWidth,
    getResizablePaneMaxSize,
    getResizablePaneMinSize,
    getResizablePaneSize,
    getVersionInfo,
    isApplyDialogHidden,
    isDialogOpen,
    resolveVisualMode,
    TEditorPosition,
    TModalDialogType,
    TVisualMode
};

import powerbi from 'powerbi-visuals-api';
import IViewport = powerbi.IViewport;
import ViewMode = powerbi.ViewMode;
import EditMode = powerbi.EditMode;
import { ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';

import { commandBarButtonStyles } from '../../config/styles';

import {
    isApplyButtonEnabled,
    applyChanges,
    createExportableTemplate,
    createNewSpec,
    openHelpSite,
    repairFormatJson,
    toggleAutoApply
} from '../commands';
import { getConfig, getVisualMetadata, providerVersions } from '../config';
import { IDataViewFlags } from '../dataView';
import { getState } from '../store';
import { ICompiledSpec } from '../specification';
import { i18nValue } from '../../core/ui/i18n';

const calculateVegaViewport = (
    viewport: IViewport,
    paneWidth: number,
    visualMode: TVisualMode,
    position: TEditorPosition
) => {
    let { height } = viewport,
        width =
            (visualMode === 'Editor' &&
                (position === 'right'
                    ? paneWidth
                    : viewport.width - paneWidth)) ||
            viewport.width;
    height -= visualViewportAdjust.top;
    width -= visualViewportAdjust.left;
    return { width, height };
};

const getCommandBarEditCommands = (): ICommandBarItemProps[] => {
    const { autoApply, canAutoApply } = getState().visual;
    return [
        getApplyCommandItem(),
        getAutoApplyCommandItem(autoApply, canAutoApply),
        getRepairFormatCommandItem()
    ];
};

const getCommandBarFarCommands = (): ICommandBarItemProps[] => [
    getNewSpecCommandItem(),
    getExportSpecCommandItem(),
    getHelpCommandItem()
];

const getResizablePaneDefaultWidth = (
    viewport: IViewport,
    position: TEditorPosition
) => {
    if (position === 'right') {
        return viewport.width * (1 - splitPaneDefaults.defaultSizePercent);
    }
    return viewport.width * splitPaneDefaults.defaultSizePercent;
};

const getResizablePaneMaxSize = () => {
    const { editorPaneIsExpanded, settings, viewport } = getState().visual,
        { editor } = settings,
        { maxSizePercent, minSize, collapsedSize } = splitPaneDefaults,
        resolvedSize =
            (editorPaneIsExpanded &&
                (editor.position === 'right'
                    ? viewport.width - minSize
                    : viewport.width * maxSizePercent)) ||
            collapsedSize;
    return resolvedSize;
};

const getResizablePaneMinSize = () => {
    const { editorPaneIsExpanded, settings, viewport } = getState().visual,
        { editor } = settings,
        { minSize, maxSizePercent, collapsedSize } = splitPaneDefaults;
    let resolvedCollapsedSize =
            editor.position === 'right'
                ? viewport.width - collapsedSize
                : collapsedSize,
        resolvedMinSize =
            editor.position === 'right'
                ? viewport.width * (1 - maxSizePercent)
                : minSize,
        resolvedSize =
            (editorPaneIsExpanded && resolvedMinSize) || resolvedCollapsedSize;
    return resolvedSize;
};

const getResizablePaneSize = (
    paneExpandedWidth: number,
    editorPaneIsExpanded: boolean,
    viewport: IViewport,
    position: TEditorPosition
) => {
    const collapsedSize =
            position === 'right'
                ? viewport.width - splitPaneDefaults.collapsedSize
                : splitPaneDefaults.collapsedSize,
        resolvedWidth =
            (editorPaneIsExpanded && paneExpandedWidth) ||
            (editorPaneIsExpanded &&
                getResizablePaneDefaultWidth(viewport, position)) ||
            collapsedSize;
    return resolvedWidth;
};

const getVersionInfo = () => {
    const visualMetadata = getVisualMetadata();
    return `${visualMetadata.version} | ${i18nValue('Provider_Vega')}: ${
        providerVersions.vega
    } | ${i18nValue('Provider_VegaLite')}: ${providerVersions.vegaLite}`;
};

const isApplyDialogHidden = () => {
    const { visualMode, isDirty } = getState().visual;
    return !(isDirty && visualMode === 'Standard');
};

const isDialogOpen = () => {
    const { isNewDialogVisible, isExportDialogVisible } = getState().visual;
    return isNewDialogVisible || isExportDialogVisible;
};

const resolveVisualMode = (
    dataViewFlags: IDataViewFlags,
    editMode: EditMode,
    isInFocus: boolean,
    viewMode: ViewMode,
    spec: ICompiledSpec
): TVisualMode => {
    const { hasValidDataViewMapping } = dataViewFlags;
    switch (true) {
        case hasValidDataViewMapping &&
            isReadWriteAdvanced(viewMode, editMode) &&
            isInFocus:
            return 'Editor';
        case isReadOnly(viewMode) && hasNoSpec(spec):
            return 'SplashReadOnly';
        case isReadWriteDefault(viewMode, editMode) &&
            hasValidDataViewMapping &&
            hasNoSpec(spec):
            return 'DataNoSpec';
        case isReadWriteDefault(viewMode, editMode) && hasNoSpec(spec):
            return 'SplashReadWrite';
        case !hasNoSpec:
            return 'SplashInitial';
        default:
            return 'Standard';
    }
};

const hasNoSpec = (spec: ICompiledSpec) =>
    !spec || !spec.status || spec.status === 'new';
const isReadOnly = (viewMode: ViewMode) => viewMode === ViewMode.View;
const isReadWriteDefault = (viewMode: ViewMode, editMode: EditMode) =>
    viewMode === ViewMode.Edit;
const isReadWriteAdvanced = (viewMode: ViewMode, editMode: EditMode) =>
    viewMode === ViewMode.Edit && editMode === EditMode.Advanced;

const splitPaneDefaults = getConfig().splitPaneDefaults;
const visualViewportAdjust = getConfig().visualViewPortAdjust;

type TEditorPosition = 'left' | 'right';
type TModalDialogType = 'new' | 'export';
type TVisualMode =
    | 'Standard'
    | 'Editor'
    | 'SplashReadOnly'
    | 'SplashReadWrite'
    | 'SplashInitial'
    | 'DataNoSpec';

const getApplyCommandItem = (): ICommandBarItemProps => ({
    key: 'applyChanges',
    text: i18nValue('Button_Apply'),
    ariaLabel: i18nValue('Button_Apply'),
    iconOnly: true,
    iconProps: {
        iconName: 'Play'
    },
    buttonStyles: commandBarButtonStyles,
    disabled: isApplyButtonEnabled(),
    onClick: applyChanges
});

const getAutoApplyCommandItem = (
    enabled: boolean,
    canAutoApply: boolean
): ICommandBarItemProps => ({
    key: 'autoApply',
    text: resolveAutoApplyText(enabled),
    ariaLabel: resolveAutoApplyAriaLabel(enabled),
    iconOnly: true,
    iconProps: {
        iconName: resolveAutoApplyIcon(enabled)
    },
    toggle: true,
    checked: enabled,
    buttonStyles: commandBarButtonStyles,
    disabled: !canAutoApply,
    onClick: toggleAutoApply
});

const getRepairFormatCommandItem = (): ICommandBarItemProps => ({
    key: 'formatJson',
    text: i18nValue('Button_Format_Json'),
    ariaLabel: i18nValue('Button_Format_Json'),
    iconOnly: true,
    iconProps: { iconName: 'Repair' },
    buttonStyles: commandBarButtonStyles,
    onClick: repairFormatJson
});

const getNewSpecCommandItem = (): ICommandBarItemProps => ({
    key: 'reset',
    text: i18nValue('Button_New'),
    iconOnly: true,
    ariaLabel: i18nValue('Button_New'),
    iconProps: { iconName: 'Page' },
    buttonStyles: commandBarButtonStyles,
    onClick: createNewSpec
});

const getExportSpecCommandItem = (): ICommandBarItemProps => {
    const { spec } = getState().visual;
    return {
        key: 'export',
        text: i18nValue('Button_Export'),
        iconOnly: true,
        ariaLabel: i18nValue('Button_Export'),
        iconProps: { iconName: 'Share' },
        buttonStyles: commandBarButtonStyles,
        disabled: !(spec?.status === 'valid'),
        onClick: createExportableTemplate
    };
};

const getHelpCommandItem = (): ICommandBarItemProps => ({
    key: 'help',
    text: i18nValue('Button_Help'),
    ariaLabel: i18nValue('Button_Reset'),
    iconOnly: true,
    iconProps: { iconName: 'Help' },
    buttonStyles: commandBarButtonStyles,
    onClick: openHelpSite
});

const resolveAutoApplyAriaLabel = (enabled: boolean) =>
    enabled
        ? i18nValue('Button_Auto_Apply_Off')
        : i18nValue('Button_Auto_Apply_On');

const resolveAutoApplyText = (enabled: boolean) =>
    enabled
        ? i18nValue('Button_Auto_Apply_Off')
        : i18nValue('Button_Auto_Apply_On');

const resolveAutoApplyIcon = (enabled: boolean) =>
    enabled ? 'CircleStopSolid' : 'PlaybackRate1x';
