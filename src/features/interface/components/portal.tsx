import React, { MutableRefObject, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AceEditor from 'react-ace';
import { PORTAL_ROOT_ID } from '../../../constants';

interface IPortalProps {
    children: React.ReactNode;
    editorRef?: MutableRefObject<AceEditor>;
}

/**
 * Generic compoenent for creating a portal within the `PortalRoot` component.
 */
export const Portal: React.FC<IPortalProps> = ({ children }) => {
    const mount = document.getElementById(PORTAL_ROOT_ID);
    const el = document.createElement('div');
    useEffect(() => {
        mount?.appendChild(el);
        return () => {
            mount?.removeChild(el);
        };
    }, [el, mount]);
    return createPortal(children, el);
};
