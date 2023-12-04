export { getConfig, getVisualMetadata, providerVersions };

import * as config from '../../../config/deneb-config.json';
import { visual } from '../../../pbiviz.json';
import { devDependencies } from '../../../package.json';

const getConfig = () => config;

const getVisualMetadata = () => visual;

const providerVersions = {
    vega: devDependencies['vega'],
    vegaLite: devDependencies['vega-lite']
};
