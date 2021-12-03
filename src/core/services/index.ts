export { fillPatternServices, hostServices, viewServices };
export * as editor from './JsonEditorServices';

import { FillPatternServices } from './FillPatternServices';
import { HostServices } from './HostServices';
import { ViewServices } from './ViewServices';

const fillPatternServices = new FillPatternServices();
const hostServices = new HostServices();
const viewServices = new ViewServices();
