---
title: "Keep non-canonical children out of DOM-positional parent components"
date: 2026-04-29
category: best-practices
module: app-core/debug-area, fluent-ui-9, react
problem_type: best_practice
component: tooling
severity: medium
applies_when:
  - Placing structural / portal-mount nodes near a radio group, tab list, accordion, or focus trap
  - Adding tooltip mount divs inside a composite ARIA widget
  - Nesting foreign children inside react-window / react-virtualized lists
  - Working with any component whose internal traversal relies on child role, type, or index
  - A library upgrade is anticipated that could change internal child-iteration heuristics
tags:
  - fluent-ui
  - accessibility
  - keyboard-navigation
  - roving-tabindex
  - dom-structure
  - composite-widget
  - silent-dependency
related_components:
  - app-core/features/debug-area/components/debug-toolbar.tsx
  - app-core/components/ui/tooltip-custom-mount.tsx
---

# Keep non-canonical children out of DOM-positional parent components

## Context

Fluent UI v9 composite widgets — `<ToolbarRadioGroup>`, `<TabList>`, `<AccordionItem>` — and their ARIA-spec equivalents (`menubar`, `listbox`, `grid`, `radiogroup`) manage keyboard navigation via internal traversal heuristics. Those heuristics walk the component's children to build a roving-tabindex map (or to compute layout, or to enforce focus order).

During a polish pass on Deneb's debug-pane toolbar, four `<TooltipCustomMount>` elements (plain `<div>` portal-mount nodes) were placed *inside* `<ToolbarRadioGroup>` alongside the four `<ToolbarRadioButton>` children. Manual keyboard QA passed — Tab into the group focused the first radio, arrow keys cycled correctly, Tab exited cleanly. The four extra divs were invisible to navigation.

A PR reviewer flagged the implementation detail behind the passing QA: Fluent UI v9's current implementation queries the radio group's children by `[role="radio"]`, filtering out the divs. That's an implementation detail, not a contract. A future Fluent minor bump could change the traversal to "all children," "first focusable child," or "by index" — silently breaking navigation with no code change on our side.

## Guidance

**Components with DOM-positional contracts should contain only their canonical child type.** When a foreign child is needed nearby (e.g. a portal mount div, a measurement shim, a hidden skip-link anchor), place it as a **sibling** of the constrained parent, not nested inside it.

`mountNode`-style props on portal libraries (Fluent UI `<Tooltip>`, React's `createPortal`, etc.) accept any DOM node regardless of its tree position. The mount div's *physical placement* in the React tree is irrelevant to where the portal renders — the portal targets the DOM node by reference, not by tree position.

```tsx
// Before — non-radio divs interleaved inside the radio group:
<ToolbarRadioGroup>
    <Tooltip mountNode={sourceMount}><ToolbarRadioButton .../></Tooltip>
    <TooltipCustomMount setRef={setSourceMount} />
    <Tooltip mountNode={dataMount}><ToolbarRadioButton .../></Tooltip>
    <TooltipCustomMount setRef={setDataMount} />
    {/* ... */}
</ToolbarRadioGroup>

// After — mount divs as siblings of the radio group:
<ToolbarRadioGroup>
    <Tooltip mountNode={sourceMount}><ToolbarRadioButton .../></Tooltip>
    <Tooltip mountNode={dataMount}><ToolbarRadioButton .../></Tooltip>
    {/* ... */}
</ToolbarRadioGroup>
<TooltipCustomMount setRef={setSourceMount} />
<TooltipCustomMount setRef={setDataMount} />
{/* ... */}
```

Tooltip behavior is preserved completely. `mountNode` accepts the same DOM node regardless of where it lives in the tree.

## Why This Matters

"Passing QA today" is not the same as "correct." A library version bump can change traversal heuristics without warning:

- Fluent UI v9's current `[role="radio"]` filter — could change to `Array.from(children)` indexing.
- A `react-window` size-measurement walk — could change to count direct children for virtualization math.
- An ARIA composite widget's `aria-owns` resolution — could be tightened to the spec's required child contract.

When that happens, a structurally-correct codebase keeps working. A codebase that "got away with it" silently breaks. The failure surfaces as a confusing keyboard-navigation regression, layout glitch, or accessibility audit failure that's hard to trace back to the original placement decision — often discovered after deploy, in production, by a screen-reader user.

The cost of getting placement right at write-time is zero (just hoist the foreign child outside the parent). The cost of getting it wrong is paid by future-you, on a deadline, after a library bump.

## When to Apply

- **Fluent UI `<ToolbarRadioGroup>`** — canonical children are `<ToolbarRadioButton>` only.
- **Fluent UI `<TabList>`** — canonical children are `<Tab>` elements.
- **`<AccordionItem>`** and similar disclosure widgets — canonical shape is header + panel body.
- **`react-window` / `react-virtualized` lists** — item children must be measurable; structural wrappers break sizing math.
- **ARIA composite widgets** (`menubar`, `listbox`, `grid`, `radiogroup`) — the WAI-ARIA spec defines the required owned-elements contract.
- **Focus traps** (`<FocusTrapZone>`, `react-focus-lock`) — internal tabbable-element walks expect a stable child shape.
- **Generally:** any parent whose internal logic makes assumptions about its child set to implement navigation, measurement, or accessibility semantics.

## Examples

Portal mount divs, drag-handle sentinels, hidden skip-link anchors, measurement shims, and "developer-only" debug nodes are all common "invisible" children that feel harmless but violate the parent's contract. In each case the fix is the same: hoist the foreign element to be a sibling of the constrained parent rather than a child inside it.

If hoisting isn't possible (the foreign child *must* be a child for layout reasons), wrap the parent in a non-positional outer container that holds both — e.g. wrap `<ToolbarRadioGroup>` in a `<div>` that also contains the mount nodes as siblings.

## Related

- [`usestate-stable-setref-portal-mount-nodes-2026-04-29.md`](usestate-stable-setref-portal-mount-nodes-2026-04-29.md) — companion finding from the same PR; covers the React `useState`/`useRef` and stable-callback invariants for the same `<TooltipCustomMount>` integration. The two invariants stack: this doc covers DOM placement; the companion covers the React render-cycle contract. Both must hold for the pattern to be durable.
- [`render-self-contained-components-bare-2026-04-29.md`](render-self-contained-components-bare-2026-04-29.md) — third companion from the same PR. Different angle on structural discipline: check the component's render output before wrapping it (analogue of "check the parent's traversal contract before nesting inside it" that this doc captures).
- [`lifecycle-owns-effect-rebind-identity-token-2026-04-28.md`](lifecycle-owns-effect-rebind-identity-token-2026-04-28.md) — same family of "silent dependencies on library/runtime contracts that a version bump can expose."
- [`../ui-bugs/modal-dialog-tab-trapped-by-keyboard-focus-handler-2026-04-10.md`](../ui-bugs/modal-dialog-tab-trapped-by-keyboard-focus-handler-2026-04-10.md) — keyboard-focus interaction with composite widgets in this codebase; concrete example of how a parent's traversal heuristic and a sibling handler can interact in unexpected ways.
