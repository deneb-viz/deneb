import React, { memo, useCallback, useMemo } from 'react';
import { createClassFromSpec, View } from 'react-vega';
import { deepEqual } from 'fast-equals';

import {
    type SpecProvider,
    type SpecRenderMode
} from '@deneb-viz/vega-runtime/embed';
import {
    getSpecificationForVisual,
    type CompiledSpecification
} from '@deneb-viz/json-processing/spec-processing';
import { logDebug, logRender, logTimeStart } from '@deneb-viz/utils/logging';
import { handleNewView, handleViewError } from '@deneb-viz/vega-runtime/view';
import { useDenebState } from '../../../state';
import { getD3FormatLocale, getD3TimeFormatLocale } from '../../../lib/i18n';
import { makeStyles } from '@fluentui/react-components';
import { VEGA_VIEWPORT_ADJUST } from '../constants';
import { type ViewEventBinder } from '../../deneb-platform';
import { type VegaDatum } from '@deneb-viz/data-core/value';
import { type Loader, type TooltipHandler } from 'vega';

type VegaRenderProps = {
    onRenderingError?: (error: Error) => void;
    onRenderingFinished?: () => void;
    onRenderingStarted?: () => void;
    tooltipHandler?: TooltipHandler;
    values: VegaDatum[];
    vegaLoader?: Loader | null;
    viewEventBinders: ViewEventBinder[];
    locale: string;
    logLevel: number;
    provider: SpecProvider;
    renderMode: SpecRenderMode;
    specification: CompiledSpecification;
    viewportHeight: number;
    viewportWidth: number;
};

const useVegaRenderStyles = makeStyles({
    root: {
        height: `calc(100% - ${VEGA_VIEWPORT_ADJUST}px)`,
        width: `calc(100% - ${VEGA_VIEWPORT_ADJUST}px)`
    }
});

/**
 * Memoization function for determining whether we should re-render the Vega content.
 * Note: tooltipHandler and viewEventBinders references are not compared directly - they're derived from values/fields/
 * settings which are already compared. However, we do check if tooltipHandler changes between defined/undefined states
 * as this indicates the tooltip setting has changed in the Power BI visual.
 */
const arePropsEqual = (
    prevProps: VegaRenderProps,
    nextProps: VegaRenderProps
) => {
    const isDatasetEqual = deepEqual(prevProps.values, nextProps.values);
    const isSpecEqual =
        prevProps.specification.hashValue == nextProps.specification.hashValue;
    const isProviderEqual = prevProps.provider == nextProps.provider;
    const isRenderModeEqual = prevProps.renderMode == nextProps.renderMode;
    const isViewportEqual =
        prevProps.viewportHeight == nextProps.viewportHeight &&
        prevProps.viewportWidth == nextProps.viewportWidth;
    const isLogLevelEqual = prevProps.logLevel == nextProps.logLevel;
    const isLocaleEqual = prevProps.locale == nextProps.locale;
    // Check if tooltip handler state changed (enabled <-> disabled)
    const isTooltipStateEqual =
        (prevProps.tooltipHandler === undefined) ===
        (nextProps.tooltipHandler === undefined);
    const isSame =
        isDatasetEqual &&
        isSpecEqual &&
        isProviderEqual &&
        isRenderModeEqual &&
        isViewportEqual &&
        isLocaleEqual &&
        isLogLevelEqual &&
        isTooltipStateEqual;
    logDebug('VegaRender: arePropsEqual', {
        isSame,
        isDatasetEqual,
        isSpecEqual,
        isProviderEqual,
        isRenderModeEqual,
        isViewportEqual,
        isLocaleEqual,
        isLogLevelEqual,
        isTooltipStateEqual
    });
    return isSame;
};

/**
 * Renders the Vega content.
 */
export const VegaRender: React.FC<VegaRenderProps> = memo(
    ({
        onRenderingError,
        onRenderingFinished,
        onRenderingStarted,
        tooltipHandler,
        values,
        vegaLoader,
        viewEventBinders,
        locale,
        logLevel,
        provider,
        renderMode,
        specification,
        viewportHeight,
        viewportWidth
    }) => {
        const classes = useVegaRenderStyles();
        const { generateRenderId, logWarn, logError } = useDenebState(
            (state) => ({
                generateRenderId: state.interface.generateRenderId,
                logWarn: state.specification.logWarn,
                logError: state.specification.logError
            })
        );
        const numberFormatLocale = useMemo(() => getD3FormatLocale(), [locale]);
        const timeFormatLocale = useMemo(
            () => getD3TimeFormatLocale(),
            [locale]
        );
        const onNewView = useCallback(
            (view: View) => {
                logDebug('New Vega view', {
                    hashValue: specification.hashValue
                });
                handleNewView(view, {
                    logLevel,
                    generateRenderId,
                    logError,
                    logWarn,
                    viewEventBinders,
                    onRenderingStarted,
                    onRenderingFinished
                });
            },
            [viewEventBinders, onRenderingStarted, onRenderingFinished]
        );
        const onError = useCallback(
            (error: Error) => {
                handleViewError(error, {
                    generateRenderId,
                    logError,
                    onRenderingError
                });
            },
            [onRenderingError]
        );
        const resolvedProvider = useMemo(
            () => (provider === 'vegaLite' ? 'vega-lite' : provider),
            [provider]
        );
        /**
         * Vega doesn't easily recompute the layout when the viewport changes,
         * so we need to override the style to force it to resize. This is
         * similar logic to the styling we apply on the `vegaRender` class,
         * but with explicit sizing rather than percentages. Doing it this way
         * allows Vega-Lite to be reasonably responsive on resize.
         */
        const styleOverride: React.CSSProperties = useMemo(
            () =>
                provider == 'vega'
                    ? {
                          height: `${viewportHeight - VEGA_VIEWPORT_ADJUST}px`,
                          width: `${viewportWidth - VEGA_VIEWPORT_ADJUST}px`
                      }
                    : {},
            [viewportHeight, viewportWidth, provider]
        );
        const VegaChart = createClassFromSpec({
            spec: getSpecificationForVisual({
                provider,
                spec: specification.spec ?? {},
                values
            }),
            mode: resolvedProvider
        });
        logRender('VegaRender', {
            hashValue: specification.hashValue,
            spec: VegaChart.getSpec()
        });
        logTimeStart('VegaRender');
        return (
            <VegaChart
                actions={false}
                renderer={renderMode}
                loader={vegaLoader || undefined}
                tooltip={tooltipHandler}
                logLevel={logLevel}
                formatLocale={numberFormatLocale}
                timeFormatLocale={timeFormatLocale}
                onNewView={onNewView}
                onError={onError}
                className={classes.root}
                style={styleOverride}
            />
        );
    },
    arePropsEqual
);
