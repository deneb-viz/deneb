import { useDenebAppSetup } from './use-deneb-app-setup';
import { Editor } from './editor/components/editor';
import { ViewportSettleGate } from './editor/components/viewport-settle-gate';

/**
 * Editor entry point. Importing this component pulls in the full editor
 * dependency tree (Monaco, schemas, Suspense gating). Consumers that only
 * need the viewer should import DenebViewer instead — the editor tree
 * will be eliminated by tree-shaking.
 *
 * The `<ViewportSettleGate>` wrapper holds the heavy editor tree
 * (FluentProvider, Allotment, Monaco) back from synchronous mount until
 * the Power BI host has finished animating the visual frame to its
 * final size. Without it the editor first paints at a transient
 * mid-animation viewport and freezes there until the synchronous mount
 * cost clears the main thread.
 */
export const DenebEditor = () => {
    useDenebAppSetup('editor');
    return (
        <ViewportSettleGate>
            <Editor />
        </ViewportSettleGate>
    );
};
