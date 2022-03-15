import { BaseType, select, Selection } from 'd3';
import { IDropdownOption } from '@fluentui/react/lib/Dropdown';
import reduce from 'lodash/reduce';

import { isFeatureEnabled } from '../utils/features';
import { getState } from '../../store';
import { getConfig } from '../utils/config';
import {
    addSelectorNamespacePrefix,
    getUrlRefById,
    svgFilterExcludingText,
    svgVegaView
} from './selectors';

/**
 * Represents flexible key/value filter configuration objects
 */
interface ISVGFilters {
    [key: string]: ISVGFilter;
}

/**
 * Top-level SVG filter configuration
 */
interface ISVGFilter {
    displayName: string;
    ignoreText?: boolean;
    attributes: ISVGFilterAttribute[];
    effects: ISVGFilterEffect[];
}

/**
 * Represents a configurable SVG filter effect
 */
interface ISVGFilterEffect {
    primitive: 'string';
    attributes: ISVGFilterAttribute[];
}

/**
 * Represents a key/value pair for SVG attributes
 */
interface ISVGFilterAttribute {
    name: string;
    value: string;
}

/**
 * For a given selection (with data-bound filter configuration), recursively apply any attributes and their values.
 */
const applySvgAttributes = (
    selection: Selection<
        BaseType,
        ISVGFilter | ISVGFilterEffect,
        HTMLElement,
        any
    >
) => {
    selection
        .datum()
        .attributes.forEach((a) => selection.attr(a.name, a.value));
};

/**
 * Enumerate SVG filter configuration, suitable for an array of dropdown list items.
 */
export const getSvgFilterAsDropdownList = (): IDropdownOption[] =>
    isFilterEnabled()
        ? reduce(
              getSvgFiltersFromConfig(),
              (result, value, key) => {
                  result.push({
                      key: key,
                      text: value.displayName
                  });
                  return result;
              },
              <IDropdownOption[]>[]
          )
        : [];

/**
 * Convenience function to read SVG filters from configuration and type them correctly.
 */
const getSvgFiltersFromConfig = () => <ISVGFilters>getConfig().svgFilters;

/**
 * Resolve the correct SVG filter, based on feature eligibility and current settings.
 */
const getSvgFilterName = () => {
    const { display } = getState().visualSettings;
    return (isFilterEnabled() && display.svgFilter) || 'none';
};

/**
 * Convenience function to confirm that we should be able to apply filters.
 */
export const isFilterEnabled = () => {
    const { vega } = getState().visualSettings;
    return isFeatureEnabled('fx') && vega.renderMode === 'svg';
};

/**
 * Handle management of SVG filter effects on the Vega view.
 */
export const resolveSvgFilter = () => {
    const svgFilterName = getSvgFilterName();
    const svg = select(svgVegaView);
    svg.selectAll('filter').remove();
    if (svgFilterName !== 'none') {
        const filter: ISVGFilter = getConfig().svgFilters?.[svgFilterName];
        const id = addSelectorNamespacePrefix(svgFilterName);
        const svgF = svg.append('filter').data([filter]).attr('id', id);
        applySvgAttributes(svgF);
        filter.effects.forEach((fe) => {
            svgF.append(fe.primitive).datum(fe).call(applySvgAttributes);
        });
        if (filter.ignoreText) {
            svg.selectAll(svgFilterExcludingText).attr(
                'filter',
                getUrlRefById(id)
            );
        } else {
            svg.attr('filter', getUrlRefById(id));
        }
    }
};
