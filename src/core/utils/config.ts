export { getConfig, getIcons, getVisualMetadata, providerVersions };

import * as config from '../../../config/deneb-config.json';
import * as icons from '../../../config/fabric-icons.json';
import { visual } from '../../../pbiviz.json';
import { devDependencies } from '../../../package.json';
import { objects } from '../../../capabilities.json';

const getConfig = () => config;

const getIcons = () => icons;

const getVisualMetadata = () => visual;

const providerVersions = {
    vega: devDependencies['vega'],
    vegaLite: devDependencies['vega-lite']
};

export const SETTINGS_OBJECTS = objects;
