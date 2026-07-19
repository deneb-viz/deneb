---
title: 'Reader-mode blank on spec-compile error is by design — no in-canvas error surface'
date: 2026-07-12
category: design-patterns
module: visual-viewer
problem_type: design_decision
component: app-core
severity: low
applies_when:
    - 'A Deneb spec fails to parse or compile and the visual renders nothing in Power BI reader/view mode'
    - 'Considering whether to surface compilation errors to report consumers (an overlay, banner, or inline message)'
    - 'Triaging audit finding M13 (viewer renders parse errors nowhere)'
tags:
    - power-bi
    - viewer-mode
    - error-surfacing
    - by-design
    - compilation
    - report-consumer
    - displaywarningicon
related_components:
    - packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx
    - packages/app-core/src/features/visual-viewer/components/vega-embed.tsx
    - packages/app-core/src/features/debug-area/components/log-viewer/log-viewer.tsx
---

# Reader-mode blank on spec-compile error is by design — no in-canvas error surface

## Decision

When a Deneb specification fails to parse or compile, the visual renders **blank**
for report consumers (reader / view mode), with **no in-canvas error message**.
This is **intentional**, not a defect.

Audit finding **M13** observed that `compilation.result.status === 'error'` is
surfaced only in the editor's debug area (`log-viewer.tsx`) and nowhere in the
viewer render path, so a report consumer sees a blank visual with no signal. The
remediation program (U14) considered adding a reader-facing error surface; the
decision (2026-07-12) is to **keep the reader experience blank**.

## Rationale

- Report consumers are not the audience for spec diagnostics. A consumer who
  notices a blank/missing visual is expected to escalate to the **report
  author**, who investigates in the **Deneb editor** — where errors _are_
  surfaced (the debug area). Errors already propagate correctly as data
  (`compilation.result.errors`) and the stale view/DOM is cleared on error
  (`vega-embed.tsx`); only the reader-facing _display_ is deliberately omitted.
- A visible in-canvas error overlay would put developer-facing failure text in
  front of end users of a published report, which is undesirable.

## Do NOT

- Add a reader-facing error overlay / banner / inline message driven by
  `compilation.result.status === 'error'`. The editor debug area is the intended
  error surface and stays as-is.

## Enforcement in the wild (2026-07-16)

The 2.0 pre-merge review found `VegaEmbedErrorBoundary` rendering a "Vega
Rendering Error" panel with the raw `error.message` to readers on any
render-phase throw in the embed subtree — a real violation of both this rule
and the message-hygiene rule, fixed in PR #716 by rendering blank (logging and
the `renderingFailed` lifecycle signal preserved). Maintainer refinement,
2026-07-15: the static construction-failure text in `src/index.ts` is
sanctioned for **constructor-catch failures only**; Vega **view-init** failures
must stay blank (with `displayWarningIcon` approved for that specific case,
pending an accurate localized string); spec-compile errors remain fully blank
per this document.

## If a minimal signal is ever wanted

The sanctioned minimal approach is the host-native
**`host.displayWarningIcon(hoverText, detailedText)`** — a warning indicator in
the visual header, _not_ an in-canvas display — wired at the root-visual host
boundary from `compilation.result.status`, with **generic, localized** text only
(never raw error/exception text; follow the durable-error message-hygiene rule).
Introducing even this is a product decision that requires **explicit approval**
before implementing.
