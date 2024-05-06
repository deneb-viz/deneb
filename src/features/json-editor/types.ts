import AceEditor from 'react-ace';
import * as ace from 'ace-builds';
import Ace = ace.Ace;
import Point = Ace.Point;
import { TSpecProvider } from '../../core/vega';
import { MutableRefObject } from 'react';
import { JSONPath } from 'jsonc-parser';

/**
 * Whether the editor is in auto-apply mode or not.
 */
export type EditorApplyMode = 'Auto' | 'Manual';

/**
 * Available providers for the JSON editor in the editor pane.
 */
export type TEditorProvider = 'jsoneditor';

/**
 * Used to specify the types of operatons we should have within the pivot
 * control in the editor pane.
 */
export type TEditorRole = 'Spec' | 'Config' | 'Settings';

/**
 * Used to track the position of a fold in the editor, and the JSONPath to its
 * position.
 */
export interface IEditorFoldPosition {
    level: number;
    point: Point;
    path: JSONPath;
}

/**
 * We need to be able to access the editors across components, so this provides
 * an interface to make this easier for forwarding refs.
 */
export interface IEditorRefs {
    spec: MutableRefObject<AceEditor>;
    config: MutableRefObject<AceEditor>;
}

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
