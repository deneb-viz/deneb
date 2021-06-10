import * as config from '../../../deneb-config.json';
import { visual } from '../../../pbiviz.json';
import { devDependencies } from '../../../package.json';

export { getConfig, getVisualMetadata, providerVersions };

const getConfig = () => config;
const getVisualMetadata = () => visual;
const providerVersions = {
    vega: devDependencies['vega'],
    vegaLite: devDependencies['vega-lite']
};
