/**
 * Type-only re-export of the monaco-editor namespace.
 *
 * Imported by lib/, state/, and context/ modules that need monaco
 * shapes without pulling in the runtime bootstrap from
 * ./monaco-integration (which has substantial side-effect imports
 * — bundled Monaco features, loader configuration, worker setup).
 *
 * Value consumers — callers that need monaco.editor.X at runtime
 * (e.g. monaco.editor.setModelMarkers) — should still go through
 * ./monaco-integration directly.
 */
import type * as monaco from 'monaco-editor';

export type { monaco };
