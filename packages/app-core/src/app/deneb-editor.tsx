import { useDenebAppSetup } from './use-deneb-app-setup';
import { Editor } from './editor/components/editor';

/**
 * Editor entry point. Importing this component pulls in the full editor
 * dependency tree (Monaco, schemas, Suspense gating). Consumers that only
 * need the viewer should import DenebViewer instead — the editor tree
 * will be eliminated by tree-shaking.
 */
export const DenebEditor = () => {
    useDenebAppSetup('editor');
    return <Editor />;
};
