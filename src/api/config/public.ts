import * as config from '../../../deneb-config.json';
import { visual } from '../../../pbiviz.json';
import { devDependencies } from '../../../package.json';

export const getConfig = () => config;

export const getVisualMetadata = () => visual;

export const providerVersions = {
    vega: devDependencies['vega'],
    vegaLite: devDependencies['vega-lite']
};
