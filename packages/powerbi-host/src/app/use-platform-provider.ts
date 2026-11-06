import { useMemo } from 'react';
import { type View } from 'vega';
import { useDenebState, type ViewEventBinder } from '@deneb-viz/app-core';

import {
    contextMenuHandler,
    crossFilterHandler,
    tooltipHandler
} from '../lib/interactivity';
import { persistOnCreateFromTemplate } from '../lib/persistence';
import { getVegaLoader } from '../lib/vega-embed';
import { useDenebVisualState } from '../state';
import { type VisualAppProps } from './kernel-config';

/**
 * The Power BI platform provider every visual gives `DenebProvider`. A visual
 * adds its own entries by spreading this into a memo of its own that depends
 * on it.
 *
 * Memoized, so `DenebProvider` consumers keep a stable reference across
 * renders that change none of the values it closes over.
 */
export const usePlatformProvider = ({
    host,
    onRenderingStarted,
    onRenderingFinished,
    onRenderingError
}: VisualAppProps) => {
    const enableTooltips = useDenebVisualState(
        (state) => state.settings?.vega?.interactivity?.enableTooltips?.value
    );
    const multiSelectDelay = useDenebVisualState(
        (state) => state.settings?.vega?.interactivity?.tooltipDelay?.value
    );
    const translate = useDenebState((state) => state.i18n.translate);
    const { launchUrl } = host;
    const vegaLoader = useMemo(
        () =>
            getVegaLoader({
                host,
                translations: {
                    hoverText: translate(
                        'PowerBI_Vega_Loader_Warning_HoverText'
                    ),
                    detailedText: translate(
                        'PowerBI_Vega_Loader_Warning_DetailedText'
                    )
                }
            }),
        [translate, host]
    );
    const pbiTooltipHandler = useMemo(
        () =>
            tooltipHandler({
                enabled: enableTooltips,
                multiSelectDelay
            }),
        [enableTooltips, multiSelectDelay]
    );
    /**
     * Power BI interactivity bound to the Vega view when it initializes.
     * Each handler reads the current dataset from the store when invoked, so
     * the binders need no dataset dependency.
     */
    const viewEventBinders = useMemo<ViewEventBinder[]>(
        () => [
            (view: View) => {
                view.addEventListener('contextmenu', contextMenuHandler());
            },
            (view: View) => {
                view.addEventListener('click', crossFilterHandler(translate));
            }
        ],
        [translate]
    );
    return useMemo(
        () => ({
            embedContainerSetByHost: true,
            onCreateProject: persistOnCreateFromTemplate,
            onRenderingError,
            onRenderingFinished,
            onRenderingStarted,
            tooltipHandler: pbiTooltipHandler,
            vegaLoader,
            viewEventBinders,
            launchUrl
        }),
        [
            launchUrl,
            onRenderingError,
            onRenderingFinished,
            onRenderingStarted,
            pbiTooltipHandler,
            vegaLoader,
            viewEventBinders
        ]
    );
};
