import { TSpecProvider } from '../../core/vega';

/**
 * Available providers for the JSON editor in the editor pane.
 */
export type TEditorProvider = 'jsoneditor';

/**
 * Used to specify the types of operatons we should have within the pivot
 * control in the editor pane.
 */
export type TEditorRole = 'spec' | 'config' | 'settings';

/**
 * Defines a JSON schema by provider and role, so we can dynamically apply
 * based on provider.
 */
export interface IEditorSchema {
    provider: TSpecProvider;
    role: TEditorRole;
    schema: object;
}

/**
 * Properties for the `Editor` React component.
 *
 *  - `role`: assigned `TEditorRole`.
 */
export interface IVisualEditorProps {
    role: TEditorRole;
}
