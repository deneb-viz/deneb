export { fillPatternServices, hostServices };
export * as editor from './JsonEditorServices';

import { FillPatternServices } from './FillPatternServices';
import { HostServices } from './HostServices';

const fillPatternServices = new FillPatternServices();
const hostServices = new HostServices();
