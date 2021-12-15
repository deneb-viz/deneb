import { dataViewObjectsParser } from 'powerbi-visuals-utils-dataviewutils';
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

import DeveloperSettings from './DeveloperSettings';
import VegaSettings from './VegaSettings';
import DataLimitSettings from './DataLimitSettings';
import EditorSettings from './EditorSettings';
import ThemeSettings from './ThemeSettings';

export default class VisualSettings extends DataViewObjectsParser {
    public developer = new DeveloperSettings();
    public vega = new VegaSettings();
    public editor = new EditorSettings();
    public theme = new ThemeSettings();
    public dataLimit = new DataLimitSettings();
}
