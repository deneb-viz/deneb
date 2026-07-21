import { useDenebAppSetup } from './use-deneb-app-setup';
import { Editor } from './editor/components/editor';

/**
 * Editor entry point. Importing this component pulls in the full editor
 * dependency tree (Monaco, schemas, Suspense gating). Consumers that only
 * need the viewer should import DenebViewer instead — the editor tree
 * will be eliminated by tree-shaking.
 *
 * Mount-time gating is handled by `<RetainedDenebEditor>` one level up,
 * which holds the wrapper at `display: none` until `window.innerWidth`
 * matches the host-reported `options.viewport.width`. By the time
 * `<DenebEditor />` renders here, the iframe is at its final size, so
 * no further gating is needed at this level.
 */
export const DenebEditor = () => {
    useDenebAppSetup('editor');
    return <Editor />;
};
