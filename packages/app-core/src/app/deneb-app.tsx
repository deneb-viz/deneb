import { useLayoutEffect } from 'react';

import { useDenebPlatformProvider } from '../components/deneb-platform';
import { type InterfaceType } from '../lib';
import { useDenebState } from '../state';
import { Editor } from './editor/components/editor';
import { Viewer } from './viewer';

export type AppProps = {
    type: InterfaceType;
};

export const DenebApp = ({ type }: AppProps) => {
    // Get platform context values
    const { embedContainerSetByHost } = useDenebPlatformProvider();

    // Sync props to state immediately on render (before effects)
    const { setInterfaceType, setEmbedContainerSetByHost } = useDenebState(
        (state) => ({
            setInterfaceType: state.interface.setType,
            setEmbedContainerSetByHost:
                state.interface.setEmbedContainerSetByHost
        })
    );

    // Sync interface type and platform configuration to state
    useLayoutEffect(() => {
        setInterfaceType(type);
        setEmbedContainerSetByHost(embedContainerSetByHost);
    }, [
        type,
        embedContainerSetByHost,
        setInterfaceType,
        setEmbedContainerSetByHost
    ]);

    // Render the appropriate UI
    return type === 'editor' ? <Editor /> : <Viewer />;
};
