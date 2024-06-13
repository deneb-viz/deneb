import { formattingSettings } from 'powerbi-visuals-utils-formattingmodel';
import {
    PREVIEW_PANE_DATA_TABLE,
    PROPERTIES_DEFAULTS
} from '@deneb-viz/core-dependencies';

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
        value: PROPERTIES_DEFAULTS.editor.theme
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
        value: PROPERTIES_DEFAULTS.editor.showViewportMarker
    });
    previewScrollbars = new formattingSettings.ToggleSwitch({
        name: 'previewScrollbars',
        displayNameKey: 'Objects_Editor_PreviewScrollbars',
        descriptionKey: 'Objects_Editor_PreviewScrollbars_Description',
        value: PROPERTIES_DEFAULTS.editor.previewScrollbars
    });
    backgroundPassThrough = new formattingSettings.ToggleSwitch({
        name: 'backgroundPassThrough',
        displayNameKey: 'Objects_Editor_BackgroundPassThrough',
        descriptionKey: 'Objects_Editor_BackgroundPassThrough_Description',
        value: PROPERTIES_DEFAULTS.editor.backgroundPassThrough
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
        value: PROPERTIES_DEFAULTS.editor.position
    });
    fontSize = new formattingSettings.NumUpDown({
        name: 'fontSize',
        displayNameKey: 'Objects_Editor_FontSize',
        descriptionKey: 'Objects_Editor_FontSize_Description',
        options: {
            minValue: {
                value: PROPERTIES_DEFAULTS.editor.fontSize.min,
                type: 0
            },
            maxValue: {
                value: PROPERTIES_DEFAULTS.editor.fontSize.max,
                type: 1
            },
            unitSymbol: PROPERTIES_DEFAULTS.unitSymbols.pt
        },
        value: PROPERTIES_DEFAULTS.editor.fontSize.default
    });
    wordWrap = new formattingSettings.ToggleSwitch({
        name: 'wordWrap',
        displayNameKey: 'Objects_Editor_WordWrap',
        descriptionKey: 'Objects_Editor_WordWrap_Description',
        value: PROPERTIES_DEFAULTS.editor.wordWrap
    });
    showLineNumbers = new formattingSettings.ToggleSwitch({
        name: 'showLineNumbers',
        displayNameKey: 'Objects_Editor_ShowLineNumbers',
        descriptionKey: 'Objects_Editor_ShowLineNumbers_Description',
        value: PROPERTIES_DEFAULTS.editor.showLineNumbers
    });
    debouncePeriod = new formattingSettings.NumUpDown({
        name: 'debouncePeriod',
        displayNameKey: 'Objects_Editor_DebouncePeriod',
        descriptionKey: 'Objects_Editor_DebouncePeriod_Description',
        options: {
            minValue: {
                value: PROPERTIES_DEFAULTS.editor.debouncePeriod.min,
                type: 0
            },
            maxValue: {
                value: PROPERTIES_DEFAULTS.editor.debouncePeriod.max,
                type: 1
            },
            unitSymbol: PROPERTIES_DEFAULTS.unitSymbols.milliseconds
        },
        value: PROPERTIES_DEFAULTS.editor.debouncePeriod.default
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
            displayName: `${PROPERTIES_DEFAULTS.editor.dataTableRowsPerPage}`,
            value: `${PROPERTIES_DEFAULTS.editor.dataTableRowsPerPage}`
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
        let i = 0, n = PREVIEW_PANE_DATA_TABLE.rowsPerPage.values.length;
        i <= n;
        i++
    ) {
        values.push({
            displayName: `${PREVIEW_PANE_DATA_TABLE.rowsPerPage.values[i]}`,
            value: `${PREVIEW_PANE_DATA_TABLE.rowsPerPage.values[i]}`
        });
    }
    return values;
};
