import { dataViewObjectsParser } from 'powerbi-visuals-utils-dataviewutils';
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

import DeveloperSettings from './developer-settings';
import DisplaySettings from './display-settings';
import GeneralSettings from './general-settings';
import VegaSettings from './vega-settings';
import DataLimitSettings from './data-limit-settings';
import EditorSettings from './editor-settings';
import ThemeSettings from './theme-settings';

export default class VisualSettings extends DataViewObjectsParser {
    public general = new GeneralSettings();
    public developer = new DeveloperSettings();
    public display = new DisplaySettings();
    public vega = new VegaSettings();
    public editor = new EditorSettings();
    public theme = new ThemeSettings();
    public dataLimit = new DataLimitSettings();
}
