import { MutableRefObject } from 'react';
import { type SpecProvider } from '@deneb-viz/vega-runtime/embed';
import { type EditorPaneRole, monaco } from '@deneb-viz/app-core';

/**
 * Available providers for the JSON editor in the editor pane.
 */
export type TEditorProvider = 'jsoneditor';

/**
 * We need to be able to access the editors across components, so this provides
 * an interface to make this easier for forwarding refs.
 */
export interface IEditorRefs {
    spec: MutableRefObject<monaco.editor.IStandaloneCodeEditor>;
    config: MutableRefObject<monaco.editor.IStandaloneCodeEditor>;
}

/**
 * Defines a JSON schema by provider and role, so we can dynamically apply
 * based on provider.
 */
export interface IEditorSchema {
    provider: SpecProvider;
    role: EditorPaneRole;
    schema: object;
}

/**
 * Properties for the `Editor` React component.
 *
 *  - `role`: assigned `EditorPaneRole`.
 */
export interface IVisualEditorProps {
    role: EditorPaneRole;
}
