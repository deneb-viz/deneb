export { fillPatternServices, hostServices, loggerServices };
export * as editor from './JsonEditorServices';

import { FillPatternServices } from './FillPatternServices';
import { HostServices } from './HostServices';
import { StoreVegaLoggerService } from './VegaLoggerService';

const fillPatternServices = new FillPatternServices();
const hostServices = new HostServices();
const loggerServices = new StoreVegaLoggerService();
