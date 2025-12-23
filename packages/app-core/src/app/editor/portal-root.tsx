/**
 * ID for the element we use to render the editor portal.
 */ const PORTAL_ROOT_ID = 'portal-root';

/**
 * React portal for handling elements that we cannot render with current
 * dependencies (e.g. custom tooltips in the Ace editor).
 */
export const PortalRoot = () => {
    return <div id={PORTAL_ROOT_ID} />;
};
