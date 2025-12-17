import { useLayoutEffect } from 'react';

import { type InterfaceType } from '../lib';
import { useDenebState } from '../state';
import { Editor } from './editor/editor';
import { Viewer } from './viewer';

export type AppProps = {
    type: InterfaceType;
};

export const DenebApp = ({ type }: AppProps) => {
    // Sync prop to state immediately on render (before effects)
    const setInterfaceType = useDenebState((state) => state.interface.setType);

    // Option 1: useLayoutEffect (runs before paint, after render)
    useLayoutEffect(() => {
        setInterfaceType(type);
    }, [type, setInterfaceType]);

    // Render the appropriate UI
    return type === 'editor' ? <Editor /> : <Viewer />;
};
