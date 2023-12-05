import powerbi from 'powerbi-visuals-api';
import FormattingCard = powerbi.visuals.FormattingCard;

import SettingsBase from './settings-base';
import { TEditorPosition } from '../core/ui';
import { TEditorProvider } from '../features/json-editor';
import {
    getDropdownSlice,
    getIntegerSlice,
    getToggleSlice
} from './formatting-model';
import { logDebug } from '../features/logging';
import { getI18nValue } from '../features/i18n';
import {
    ICapabilitiesEnumMember,
    IDropdownSliceOptions,
    IIntegerSliceOptions,
    IToggleSliceOptions
} from './types';
import {
    CAPABILITIES,
    PREVIEW_PANE_DATA_TABLE,
    PROPERTY_DEFAULTS
} from '../../config';

const OBJECT_NAME = 'editor';
const OBJECT_DEF = CAPABILITIES.objects[OBJECT_NAME];
const PROPERTIES = OBJECT_DEF.properties;

/**
 * Manages editor preferences for the visual.
 */
export default class EditorSettings extends SettingsBase {
    // Preferred editor position within interface
    public position: TEditorPosition = <TEditorPosition>(
        PROPERTY_DEFAULTS.editor.position
    );
    // JSON editor font size
    public fontSize: number = PROPERTY_DEFAULTS.editor.fontSize.default;
    // Whether to wrap text in the JSON editor or not
    public wordWrap: boolean = PROPERTY_DEFAULTS.editor.wordWrap;
    // Show the gutter in the JSON editor
    public showGutter: boolean = PROPERTY_DEFAULTS.editor.showGutter;
    // Show line numbers in the JSON Editor
    public showLineNumbers: boolean = PROPERTY_DEFAULTS.editor.showLineNumbers;
    // Show viewport marker in editor
    public showViewportMarker: boolean =
        PROPERTY_DEFAULTS.editor.showViewportMarker;
    // Specified provider (Vega or Vega-Lite)
    public provider: TEditorProvider = <TEditorProvider>(
        PROPERTY_DEFAULTS.editor.provider
    );
    // Show scrollbars in advanced editor preview area
    public previewScrollbars: boolean =
        PROPERTY_DEFAULTS.editor.previewScrollbars;
    public debugTableRowsPerPage: number =
        PROPERTY_DEFAULTS.editor.dataTableRowsPerPage;

    /**
     * Formatting card for these settings.
     */
    // eslint-disable-next-line max-lines-per-function
    public getFormattingCard = (): FormattingCard => {
        logDebug(`getFormattingCard: ${OBJECT_NAME}`);
        const SHOW_VIEWPORT_MARKER_SLICE: IToggleSliceOptions = {
            displayNameKey: PROPERTIES.showViewportMarker.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'showViewportMarker',
            value: this.showViewportMarker
        };
        const PREVIEW_SCROLLBARS_SLICE: IToggleSliceOptions = {
            displayNameKey: PROPERTIES.previewScrollbars.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'previewScrollbars',
            value: this.previewScrollbars
        };
        const POSITION_SLICE: IDropdownSliceOptions = {
            displayNameKey: PROPERTIES.position.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'position',
            value: this.position,
            items: PROPERTIES.position.type.enumeration
        };
        const FONT_SIZE_SLICE: IIntegerSliceOptions = {
            displayNameKey: PROPERTIES.fontSize.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'fontSize',
            value: this.fontSize,
            minValue: PROPERTY_DEFAULTS.editor.fontSize.min,
            maxValue: PROPERTY_DEFAULTS.editor.fontSize.max
        };
        const WORD_WRAP_SLICE: IToggleSliceOptions = {
            displayNameKey: PROPERTIES.wordWrap.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'wordWrap',
            value: this.wordWrap
        };
        const SHOW_GUTTER_SLICE: IToggleSliceOptions = {
            displayNameKey: PROPERTIES.showGutter.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'showGutter',
            value: this.showGutter
        };
        const SHOW_LINE_NUMBERS_SLICE: IToggleSliceOptions = {
            displayNameKey: PROPERTIES.showLineNumbers.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'showLineNumbers',
            value: this.showLineNumbers,
            disabled: !this.showGutter
        };
        const TABLE_ROW_COUNT_SLICE: IDropdownSliceOptions = {
            displayNameKey: PROPERTIES.debugTableRowsPerPage.displayNameKey,
            objectName: OBJECT_NAME,
            propertyName: 'debugTableRowsPerPage',
            value: `${this.debugTableRowsPerPage}`,
            items: getPageRowCountEnum()
        };
        console.log('DATA_ROW_COUNT_SLICE', TABLE_ROW_COUNT_SLICE);
        return {
            displayName: getI18nValue(OBJECT_DEF.displayNameKey),
            description: getI18nValue(OBJECT_DEF.descriptionKey),
            uid: OBJECT_DEF.displayNameKey,
            revertToDefaultDescriptors: [
                SHOW_VIEWPORT_MARKER_SLICE,
                PREVIEW_SCROLLBARS_SLICE,
                POSITION_SLICE,
                FONT_SIZE_SLICE,
                WORD_WRAP_SLICE,
                SHOW_GUTTER_SLICE,
                SHOW_LINE_NUMBERS_SLICE,
                TABLE_ROW_COUNT_SLICE
            ],
            groups: [
                {
                    displayName: getI18nValue(
                        `${OBJECT_DEF.displayNameKey}_Group_Preview`
                    ),
                    uid: `${OBJECT_DEF.displayNameKey}_Group_Preview`,
                    slices: [
                        getToggleSlice(SHOW_VIEWPORT_MARKER_SLICE),
                        getToggleSlice(PREVIEW_SCROLLBARS_SLICE)
                    ]
                },
                {
                    displayName: getI18nValue(
                        `${OBJECT_DEF.displayNameKey}_Group_JSON`
                    ),
                    uid: `${OBJECT_DEF.displayNameKey}_Group_JSON`,
                    slices: [
                        getDropdownSlice(POSITION_SLICE),
                        getIntegerSlice(FONT_SIZE_SLICE),
                        getToggleSlice(WORD_WRAP_SLICE),
                        getToggleSlice(SHOW_GUTTER_SLICE),
                        getToggleSlice(SHOW_LINE_NUMBERS_SLICE)
                    ]
                },
                {
                    displayName: getI18nValue(
                        `${OBJECT_DEF.displayNameKey}_Group_Debug_Pane`
                    ),
                    uid: `${OBJECT_DEF.displayNameKey}_Group_Debug_Pane`,
                    slices: [getDropdownSlice(TABLE_ROW_COUNT_SLICE)]
                }
            ]
        };
    };
}

const getPageRowCountEnum = (): ICapabilitiesEnumMember[] => {
    return PREVIEW_PANE_DATA_TABLE.rowsPerPage.values.map((value: number) => {
        return {
            value: value.toString(),
            displayName: value.toString()
        };
    });
};
