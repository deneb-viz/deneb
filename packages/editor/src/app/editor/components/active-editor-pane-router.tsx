import { logRender } from '@deneb-viz/utils/logging';
import {
    SpecificationEditorSelectedOperation,
    SpecificationJsonEditor
} from '../../../features/specification-editor';
import { SettingsPane } from '../../../features/settings-pane';

/**
 * App-layer composer: maps each EditorPaneRole to the content that
 * should appear in its visibility slot. The Spec and Config slots
 * render the JSON editor (parameterised by role); the Settings slot
 * renders the SettingsPane feature.
 */
export const ActiveEditorPaneRouter = () => {
    logRender('ActiveEditorPaneRouter');
    return (
        <>
            <SpecificationEditorSelectedOperation operation='Spec'>
                <SpecificationJsonEditor thisEditorRole='Spec' />
            </SpecificationEditorSelectedOperation>
            <SpecificationEditorSelectedOperation operation='Config'>
                <SpecificationJsonEditor thisEditorRole='Config' />
            </SpecificationEditorSelectedOperation>
            <SpecificationEditorSelectedOperation operation='Settings'>
                <SettingsPane />
            </SpecificationEditorSelectedOperation>
        </>
    );
};
