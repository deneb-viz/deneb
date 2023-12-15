import React from 'react';
import { PORTAL_ROOT_ID } from '../../../constants';

/**
 * React portal for handling elements that we cannot render with current
 * dependencies (e.g. custom tooltips in the Ace editor).
 */
export const PortalRoot: React.FC = () => {
    return <div id={PORTAL_ROOT_ID} />;
};
