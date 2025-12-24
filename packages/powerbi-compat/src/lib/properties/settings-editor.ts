import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import {
    DATA_VIEWER_CONFIGURATION,
    EDITOR_DEFAULTS
} from '@deneb-viz/configuration';
import { DEFAULTS } from './constants';

export class SettingsEditor extends formattingSettings.CompositeCard {
    name = 'editor';
    displayNameKey = 'Objects_Editor';
    descriptionKey = 'Objects_Editor_Description';
    interface = new SettingsEditorGroupInterface(Object());
    preview = new SettingsEditorGroupPreview(Object());
    json = new SettingsEditorGroupJson(Object());
    completion = new SettingsEditorGroupCompletion(Object());
    debugPane = new SettingsEditorGroupDebugPane(Object());
    groups = [this.interface, this.preview, this.json, this.debugPane];
}

class SettingsEditorGroupInterface extends formattingSettings.Group {
    name = 'interface';
    displayNameKey = 'Objects_Editor_Group_Interface';
    theme = new formattingSettings.AutoDropdown({
        name: 'theme',
        displayNameKey: 'Objects_Editor_Theme',
        descriptionKey: 'Objects_Editor_Theme_Description',
        value: EDITOR_DEFAULTS.theme
    });
    slices = [this.theme];
}

class SettingsEditorGroupPreview extends formattingSettings.Group {
    name = 'preview';
    displayNameKey = 'Objects_Editor_Group_Preview';
    showViewportMarker = new formattingSettings.ToggleSwitch({
        name: 'showViewportMarker',
        displayNameKey: 'Objects_Editor_ShowViewportMarker',
        descriptionKey: 'Objects_Editor_ShowViewportMarker_Description',
        value: EDITOR_DEFAULTS.previewAreaShowBorder
    });
    previewScrollbars = new formattingSettings.ToggleSwitch({
        name: 'previewScrollbars',
        displayNameKey: 'Objects_Editor_PreviewScrollbars',
        descriptionKey: 'Objects_Editor_PreviewScrollbars_Description',
        value: EDITOR_DEFAULTS.previewAreaShowScrollbarsOnOverflow
    });
    backgroundPassThrough = new formattingSettings.ToggleSwitch({
        name: 'backgroundPassThrough',
        displayNameKey: 'Objects_Editor_BackgroundPassThrough',
        descriptionKey: 'Objects_Editor_BackgroundPassThrough_Description',
        value: EDITOR_DEFAULTS.previewAreaTransparentBackground
    });
    slices = [
        this.showViewportMarker,
        this.previewScrollbars,
        this.backgroundPassThrough
    ];
}

class SettingsEditorGroupJson extends formattingSettings.Group {
    name = 'json';
    displayNameKey = 'Objects_Editor_Group_JSON';
    position = new formattingSettings.AutoDropdown({
        name: 'position',
        displayNameKey: 'Objects_Editor_Position',
        descriptionKey: 'Objects_Editor_Position_Description',
        value: EDITOR_DEFAULTS.position
    });
    fontSize = new formattingSettings.NumUpDown({
        name: 'fontSize',
        displayNameKey: 'Objects_Editor_FontSize',
        descriptionKey: 'Objects_Editor_FontSize_Description',
        options: {
            minValue: {
                value: EDITOR_DEFAULTS.fontSize.min,
                type: 0
            },
            maxValue: {
                value: EDITOR_DEFAULTS.fontSize.max,
                type: 1
            },
            unitSymbol: DEFAULTS.unitSymbols.pt
        },
        value: EDITOR_DEFAULTS.fontSize.default
    });
    wordWrap = new formattingSettings.ToggleSwitch({
        name: 'wordWrap',
        displayNameKey: 'Objects_Editor_WordWrap',
        descriptionKey: 'Objects_Editor_WordWrap_Description',
        value: EDITOR_DEFAULTS.wordWrap
    });
    showLineNumbers = new formattingSettings.ToggleSwitch({
        name: 'showLineNumbers',
        displayNameKey: 'Objects_Editor_ShowLineNumbers',
        descriptionKey: 'Objects_Editor_ShowLineNumbers_Description',
        value: EDITOR_DEFAULTS.showLineNumbers
    });
    debouncePeriod = new formattingSettings.NumUpDown({
        name: 'debouncePeriod',
        displayNameKey: 'Objects_Editor_DebouncePeriod',
        descriptionKey: 'Objects_Editor_DebouncePeriod_Description',
        options: {
            minValue: {
                value: EDITOR_DEFAULTS.debouncePeriod.min,
                type: 0
            },
            maxValue: {
                value: EDITOR_DEFAULTS.debouncePeriod.max,
                type: 1
            },
            unitSymbol: DEFAULTS.unitSymbols.milliseconds
        },
        value: EDITOR_DEFAULTS.debouncePeriod.default
    });
    slices = [
        this.position,
        this.fontSize,
        this.wordWrap,
        this.showLineNumbers,
        this.debouncePeriod
    ];
}

class SettingsEditorGroupCompletion extends formattingSettings.Group {
    name = 'completion';
    displayNameKey = 'Objects_Editor_Group_Completion';
    slices = [];
}

class SettingsEditorGroupDebugPane extends formattingSettings.Group {
    name = 'debugPane';
    displayNameKey = 'Objects_Editor_Group_DebugPane';
    debugTableRowsPerPage = new formattingSettings.ItemDropdown({
        name: 'debugTableRowsPerPage',
        displayNameKey: 'Objects_Editor_DebugTableRowsPerPage',
        descriptionKey: 'Objects_Editor_DebugTableRowsPerPage_Description',
        items: getPageRowCountEnumValues(),
        value: {
            displayName: `${DATA_VIEWER_CONFIGURATION.rowsPerPage.default}`,
            value: `${DATA_VIEWER_CONFIGURATION.rowsPerPage.default}`
        }
    });
    slices = [this.debugTableRowsPerPage];
}

/**
 * Dynamically generates an enum for the number of rows to display in the debug table, from the constant used to manage throughout.
 */
const getPageRowCountEnumValues = () => {
    const values = [];
    for (
        let i = 0, n = DATA_VIEWER_CONFIGURATION.rowsPerPage.values.length;
        i <= n;
        i++
    ) {
        values.push({
            displayName: `${DATA_VIEWER_CONFIGURATION.rowsPerPage.values[i]}`,
            value: `${DATA_VIEWER_CONFIGURATION.rowsPerPage.values[i]}`
        });
    }
    return values;
};
