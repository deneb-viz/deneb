import { dataViewObjectsParser } from 'powerbi-visuals-utils-dataviewutils';
import DataViewObjectsParser = dataViewObjectsParser.DataViewObjectsParser;

import VegaSettings from './VegaSettings';
import DataLimitSettings from './DataLimitSettings';
import EditorSettings from './EditorSettings';

export default class VisualSettings extends DataViewObjectsParser {
    public vega = new VegaSettings();
    public editor = new EditorSettings();
    public dataLimit = new DataLimitSettings();
}
