export * as advancedEditor from './advancedEditor';
export * as commands from './commands';
export * as dom from './dom';
export * as fluent from './fluent';
export * as icons from './icons';
export * as labels from './labels';
export * as selectors from './selectors';
export * as svgFilter from './svgFilter';

export { getVersionInfo, TEditorPosition };

import { getVisualMetadata, providerVersions } from '../../core/utils/config';
import { getI18nValue } from '../../features/i18n';

/**
 * Returns visual + Vega + Vega-Lite version information as a single string.
 */
const getVersionInfo = () => {
    const visualMetadata = getVisualMetadata();
    return `${visualMetadata.version} | ${getI18nValue('Provider_Vega')}: ${
        providerVersions.vega
    } | ${getI18nValue('Provider_VegaLite')}: ${providerVersions.vegaLite}`;
};

/**
 * Type to allow structure of the value for position of editor within the advanced editor view.
 */
type TEditorPosition = 'left' | 'right';
