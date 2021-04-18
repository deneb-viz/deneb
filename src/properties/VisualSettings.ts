import { dataViewObjectsParser } from 'powerbi-visuals-utils-dataviewutils';
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

import DeveloperSettings from './DeveloperSettings';
import VegaSettings from './VegaSettings';
import DataLimitSettings from './DataLimitSettings';
import EditorSettings from './EditorSettings';

export default class VisualSettings extends DataViewObjectsParser {
    public developer = new DeveloperSettings();
    public vega = new VegaSettings();
    public editor = new EditorSettings();
    public dataLimit = new DataLimitSettings();
}
