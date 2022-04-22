export { fillPatternServices, hostServices, loggerServices, viewServices };
export * as editor from './JsonEditorServices';

import { FillPatternServices } from './FillPatternServices';
import { HostServices } from './HostServices';
import { StoreVegaLoggerService } from './VegaLoggerService';
import { ViewServices } from './ViewServices';

const fillPatternServices = new FillPatternServices();
const hostServices = new HostServices();
const loggerServices = new StoreVegaLoggerService();
const viewServices = new ViewServices();
