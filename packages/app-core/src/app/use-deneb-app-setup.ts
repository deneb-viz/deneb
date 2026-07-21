import { useLayoutEffect } from 'react';

import { useDenebPlatformProvider } from '../components/deneb-platform';
import { type InterfaceType } from '../lib';
import { useDenebState } from '../state';
import { VegaExtensibilityServices } from '@deneb-viz/vega-runtime/extensibility';
import { VegaPatternFillServices } from '@deneb-viz/vega-runtime/pattern-fill';

/**
 * Shared setup hook for Deneb app components. Syncs the interface type
 * and platform configuration to state and binds Vega services.
 */
export const useDenebAppSetup = (type: InterfaceType) => {
    const { embedContainerSetByHost } = useDenebPlatformProvider();
    const { setInterfaceType, setEmbedContainerSetByHost } = useDenebState(
        (state) => ({
            setInterfaceType: state.interface.setType,
            setEmbedContainerSetByHost:
                state.interface.setEmbedContainerSetByHost
        })
    );

    useLayoutEffect(() => {
        setInterfaceType(type);
        setEmbedContainerSetByHost(embedContainerSetByHost);
        VegaExtensibilityServices.bind();
        VegaPatternFillServices.bind();
    }, [
        type,
        embedContainerSetByHost,
        setInterfaceType,
        setEmbedContainerSetByHost
    ]);
};
