/**
 * Type-only re-export of the monaco-editor namespace.
 *
 * Imported by lib/, state/, and context/ modules that need monaco
 * shapes without pulling in the runtime bootstrap from
 * components/code-editor/monaco-integration.
 *
 * Value consumers (callers that need monaco.editor.X at runtime,
 * e.g. monaco.editor.setModelMarkers) should still go through
 * components/code-editor/monaco-integration until that runtime
 * file is relocated to lib/ in a future task.
 */
import type * as monaco from 'monaco-editor';

export type { monaco };
