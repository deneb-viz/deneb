# `@deneb-viz/editor`

The Deneb advanced editor: the specification editor (Monaco), command bar,
preview and debug areas, settings pane, template catalog and export pane,
composed on top of `@deneb-viz/app-core`.

The dependency is strictly one-way: this package imports `@deneb-viz/app-core`
(the viewer core, store and platform contract); app-core never imports this
package. Both apps that mount the editor call `installEditorState()` once at
startup, before the first editor-state read, to merge the editor-only store
slices into app-core's singleton store and register the editor-side
subscriptions.

Layering inside `src/` follows the same model as app-core (see
`packages/app-core/ARCHITECTURE.md`), enforced by the shared boundaries
lint from `@deneb-viz/eslint-config/boundaries.js` and the
`architecture-boundaries` canary test.

Build: `tsdown` for the package entry plus two IIFE web workers (the Monaco
JSON language worker and the debug-area dataset viewer worker), inlined into
the bundle as raw text.
