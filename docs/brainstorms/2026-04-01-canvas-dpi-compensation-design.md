# Canvas DPI Compensation Design

## Problem

When users render Vega visualizations in canvas mode, Power BI applies its own CSS scaling based on the report canvas zoom level. This happens outside the visual's sandbox. The visual renders at the prescribed viewport dimensions, but Power BI then stretches or shrinks the output — causing blurry canvas rendering at non-100% zoom levels. SVG rendering is unaffected because it scales without pixel loss.

Power BI's `VisualUpdateOptions.viewport` actually provides a `ScaledViewport` (despite the `IViewport` type declaration), which includes a `scale` property representing the canvas zoom as a decimal (e.g., `1.11` = 111% zoom). This value is currently ignored.

## Pre-requisite: Renderer Regression

There is a regression in the current branch where the project slice's `renderMode` setting (canvas vs SVG) is not being applied to the Vega embed. The setting UI correctly remembers "canvas" but the visual renders as SVG. This must be investigated and fixed before the DPI compensation feature can be implemented or tested. This regression is not present in the production 1.9 branch.

## Solution

Use Vega's `scaleFactor` embed option to compensate for Power BI's zoom scaling. When enabled:

1. Capture the `scale` value from Power BI's viewport (default to `1` if undefined)
2. Pass it as `scaleFactor` to `buildEmbedOptions`
3. Vega's canvas renderer multiplies the backing buffer resolution by `scaleFactor` (composed with `devicePixelRatio` internally)
4. After Power BI applies its CSS zoom, the effective pixel resolution is approximately 1:1 with the display — producing crisp output

### Data Flow

```
Power BI update() → viewport.scale (default 1) → interface slice (embedScale)
                                                        ↓
Project slice (scaleToZoom setting) + renderMode === 'canvas'
                                                        ↓
                                            compilation trigger
                                                        ↓
                              buildEmbedOptions({ scaleFactor: scale })
                                                        ↓
                              Vega canvas renders at scale × devicePixelRatio
                                                        ↓
                      Power BI zooms → effective resolution ≈ 1:1 → crisp output
```

## Setting

- **Label:** "Scale to report zoom level"
- **Location:** General section of the project setup pane
- **Default:** `false` (off)
- **Behavior:** Disabled/grayed out when renderer is SVG; only active when canvas is selected
- **Persistence:** `stateManagement.scaleToZoom` in Power BI visual properties (text type, same pattern as `denebMetaVersion`)
- **Not included in template metadata** — renderer preference is situational to the importing user's context, not a template characteristic

## Compilation Trigger

When the setting is enabled, changes to the viewport `scale` value trigger recompilation. This ensures the canvas re-renders at the correct resolution immediately when the user changes zoom level, rather than waiting for the next natural render cycle (spec change, data refresh).

When the setting is disabled, `scale` changes are ignored and no `scaleFactor` is passed to the embed options (Vega defaults to 1).

## Files

| Area | Files |
|------|-------|
| Renderer regression | `packages/vega-runtime/src/lib/compilation/embed-options.ts`, `packages/app-core/src/components/visual-viewer/` — exact scope depends on investigation |
| Viewport scale capture | `src/state/updates.ts`, `src/state/interface.ts` — extract `scale` from viewport, store as `embedScale` |
| Persistence | `capabilities.json`, `src/lib/persistence/model/constants.ts`, `src/lib/persistence/model/settings-state-management.ts` — new `scaleToZoom` property |
| Project type & state | `packages/app-core/src/lib/project/types.ts`, `packages/app-core/src/state/project.ts` — add `scaleToZoom: boolean` + setter |
| Sync mapping | `src/lib/state/project-sync-mappings.ts` — new entry for `scaleToZoom` |
| Compilation | `packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx` — include `embedScale` + `scaleToZoom` as compilation triggers |
| Embed options | `packages/vega-runtime/src/lib/compilation/embed-options.ts` — pass `scaleFactor` when applicable |
| Settings UI | `packages/app-core/src/features/settings-pane/` — toggle in General section, disabled when renderer is SVG |
| i18n | `packages/app-core/src/i18n/en-US.json`, `stringResources/en-US/resources.resjson` |

## Testing

- Unit tests for `buildEmbedOptions` with `scaleFactor` scenarios
- Unit test for viewport scale extraction (default to 1 when undefined)
- Manual testing: canvas mode at 100%, 150%, 272% zoom — compare sharpness with setting on/off

## Out of Scope

- Adding `renderMode` or `scaleToZoom` to template metadata (can be added later if requested)
- SVG renderer (scales without pixel loss, no compensation needed)
- `TEMPLATE_USERMETA_VERSION` bump (no template schema changes)

## Known Limitation: Editor Preview Zoom Click Targets

The editor preview zoom uses CSS `transform: scale()` on a parent container. While the DPI compensation ensures the canvas renders crisply at zoom, Vega's internal event coordinate system does not account for the parent's CSS transform. This causes click/interaction targets to be offset by the scale factor — e.g., clicking on 'DE' at 200% zoom may register as a click on 'FR' (the element at that position in the untransformed layout).

This is a **pre-existing issue** (present in 1.9 and earlier) and is not caused by the DPI compensation feature. The viewer canvas does not have this problem because Power BI's zoom is applied outside the visual's iframe.

**Potential future fixes:**
- Intercept pointer events on the preview container and divide coordinates by the CSS scale factor before Vega processes them
- Replace the CSS transform zoom with actual viewport resizing (trade-off: changes chart layout at different zoom levels)
