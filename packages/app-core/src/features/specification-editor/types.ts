import { type RefObject } from 'react';
import { monaco } from '../../components/code-editor/monaco-integration';

/**
 * We need to be able to access the editors across components, so this provides an interface to make this easier for
 * forwarding refs.
 */
export type SpecificationEditorRefs = {
    spec: RefObject<monaco.editor.IStandaloneCodeEditor | null>;
    config: RefObject<monaco.editor.IStandaloneCodeEditor | null>;
};
