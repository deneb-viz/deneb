/**
 * Contract describing the imperative handles exposed by the
 * specification-editor feature. Lives in lib/ so non-feature consumers
 * (command actions, the command bar) can depend on the shape without
 * importing into a feature module.
 *
 * The specification-editor feature is the authoritative implementer.
 */
import { type RefObject } from 'react';
import type { monaco } from '../../components/code-editor/monaco-integration';

export type SpecificationEditorRefs = {
    spec: RefObject<monaco.editor.IStandaloneCodeEditor | null>;
    config: RefObject<monaco.editor.IStandaloneCodeEditor | null>;
};
