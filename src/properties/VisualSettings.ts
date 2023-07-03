import { dataViewObjectsParser } from 'powerbi-visuals-utils-dataviewutils';
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

import DeveloperSettings from './DeveloperSettings';
import DisplaySettings from './DisplaySettings';
import GeneralSettings from './GeneralSettings';
import VegaSettings from './VegaSettings';
import DataLimitSettings from './DataLimitSettings';
import EditorSettings from './EditorSettings';
import ThemeSettings from './ThemeSettings';

export default class VisualSettings extends DataViewObjectsParser {
    public general = new GeneralSettings();
    public developer = new DeveloperSettings();
    public display = new DisplaySettings();
    public vega = new VegaSettings();
    public editor = new EditorSettings();
    public theme = new ThemeSettings();
    public dataLimit = new DataLimitSettings();
}
