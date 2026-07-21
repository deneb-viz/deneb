import { useDenebAppSetup } from './use-deneb-app-setup';
import { Viewer } from './viewer';

/**
 * Viewer entry point. This component has no dependency on the editor tree
 * (Monaco, schemas, etc.), making it safe for viewer-only builds where
 * tree-shaking eliminates all editor code.
 */
export const DenebViewer = () => {
    useDenebAppSetup('viewer');
    return <Viewer />;
};
