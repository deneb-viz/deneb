export { getConfig, getVisualMetadata };

import * as config from '../../../config/deneb-config.json';
import { visual } from '../../../pbiviz.json';

const getConfig = () => config;

const getVisualMetadata = () => visual;
