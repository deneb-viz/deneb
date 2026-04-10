# Canvas DPI Compensation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the renderer regression (canvas setting ignored) and add opt-in canvas DPI compensation that uses Power BI's viewport scale to render crisp canvas output at any zoom level.

**Architecture:** The renderer regression is caused by `buildEmbedOptions()` hardcoding `renderer: 'svg'` instead of using the project's `renderMode`. The fix passes `renderMode` through the compilation flow via `embedOptions`. The DPI compensation feature captures `scale` from Power BI's `ScaledViewport`, stores it in the interface slice, adds a `scaleToZoom` setting persisted in `stateManagement`, and passes `scaleFactor` to Vega's embed options when enabled and renderer is canvas.

**Tech Stack:** Zustand (state management), Power BI Visuals API (`ScaledViewport`), Vega embed options (`scaleFactor`, `renderer`), Fluent UI (Switch component)

---

### Task 1: Fix the renderer regression

The `buildEmbedOptions()` function hardcodes `renderer: PROJECT_DEFAULTS.renderMode` ('svg') at line 30. Even though the UI correctly updates `project.renderMode` in state and it syncs to Power BI, the value is never passed to `compileSpec()`. The fix: pass `renderMode` from state through `compileSpec()` via the existing `embedOptions` parameter.

**Files:**
- Modify: `packages/vega-runtime/src/lib/compilation/__tests__/embed-options.test.ts`
- Modify: `packages/vega-runtime/src/lib/compilation/embed-options.ts:22-41`
- Modify: `packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx:66-111,184-194,227-237,298-326`

- [ ] **Step 1: Add failing test for renderer override**

In `packages/vega-runtime/src/lib/compilation/__tests__/embed-options.test.ts`, add after the last test (line 247):

```typescript
    it('should use renderer from userOptions instead of default', () => {
        const input: BuildEmbedOptionsInput = {
            mode: 'vega',
            userOptions: { renderer: 'canvas' }
        };

        const result = buildEmbedOptions(input);

        expect(result.renderer).toBe('canvas');
    });
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npx vitest run packages/vega-runtime/src/lib/compilation/__tests__/embed-options.test.ts`

Expected: PASS — this test actually passes already because `mergician` merges `userOptions` over `baseOptions`. The existing test at line 75 ("should allow user options to override defaults") already covers this. This confirms the `buildEmbedOptions` function is fine — the bug is that `visual-viewer.tsx` never passes `renderMode` to it.

- [ ] **Step 3: Extract renderMode from state in VisualViewer**

In `packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx`, add `renderMode` to the `useDenebState` selector (after `logLevel` at line 90):

```typescript
        renderMode: state.project.renderMode,
```

Add the import for `SpecRenderMode` if not already present (it's used as a type cast). The existing import at line 13 already brings in `SpecProvider` from `@deneb-viz/vega-runtime/embed` — add `SpecRenderMode` to that import:

```typescript
import { type SpecProvider, type SpecRenderMode } from '@deneb-viz/vega-runtime/embed';
```

Add `renderMode` to the destructured variables from `useDenebState` (after `logLevel`):

```typescript
    const {
        config,
        spec,
        logLevel,
        renderMode,
        ...
```

- [ ] **Step 4: Pass renderMode as embedOptions to all compileSpec calls**

There are three `compileSpec()` call sites in `visual-viewer.tsx`. Add `embedOptions: { renderer: renderMode as Renderers }` to each.

Add the `Renderers` import at the top of the file:

```typescript
import type { Renderers } from 'vega';
```

**Call site 1** — main compilation effect (~line 307):

```typescript
        compileSpec({
            spec,
            config,
            provider,
            schemaValidator,
            containerDimensions: {
                width: viewportWidth,
                height: viewportHeight
            },
            logLevel,
            embedOptions: { renderer: renderMode as Renderers }
        });
```

**Call site 2** — data change re-compile (~line 184):

```typescript
            compileSpec({
                spec,
                config,
                provider,
                schemaValidator,
                containerDimensions: {
                    width: viewportWidth,
                    height: viewportHeight
                },
                logLevel,
                embedOptions: { renderer: renderMode as Renderers }
            });
```

**Call site 3** — incremental update failure fallback (~line 227):

```typescript
                compileSpec({
                    spec,
                    config,
                    provider,
                    schemaValidator,
                    containerDimensions: {
                        width: viewportWidth,
                        height: viewportHeight
                    },
                    logLevel,
                    embedOptions: { renderer: renderMode as Renderers }
                });
```

- [ ] **Step 5: Add renderMode to the compilation trigger dependency array**

In the main compilation `useEffect` dependency array (~line 318), add `renderMode`:

```typescript
    }, [
        spec,
        config,
        provider,
        renderMode,
        viewportHeight,
        viewportWidth,
        logLevel,
        schemaValidator
    ]);
```

- [ ] **Step 6: Verify build compiles**

Run: `npm run webpack:build`
Expected: Clean compile.

- [ ] **Step 7: Manual test**

In the Power BI dev environment:
1. Open the editor settings
2. Switch render mode to "Canvas"
3. Verify the visual renders using canvas (inspect the DOM — should see a `<canvas>` element, not `<svg>`)
4. Switch back to SVG — verify it renders as SVG

- [ ] **Step 8: Commit**

```
fix(app-core): pass renderMode to compilation embedOptions

buildEmbedOptions() was always using the default 'svg' renderer
because visual-viewer.tsx never extracted renderMode from state
or passed it through to compileSpec(). The UI correctly saved the
setting but it was never applied to the Vega embed.
```

---

### Task 2: Capture viewport scale in state

Power BI's `ScaledViewport` provides a `scale` property alongside `width` and `height`. The `ContainerViewport` type in app-core already has `scale?: number`. We need to extract it from the Power BI update options and include it when setting `embedViewport`.

**Files:**
- Modify: `src/state/updates.ts:84-122`

- [ ] **Step 1: Include scale when building targetViewport**

In `src/state/updates.ts`, the viewport extraction block (~line 84-122) builds `targetViewport` with only `height` and `width`. Add `scale`:

Change the `targetViewport` construction (~line 100-108) to:

```typescript
                const targetViewport = {
                    height:
                        viewport.height === 0
                            ? persistedViewport.height
                            : viewport.height,
                    width:
                        viewport.width === 0
                            ? persistedViewport.width
                            : viewport.width,
                    scale: (viewport as { scale?: number }).scale ?? 1
                };
```

Note: The Power BI API declares `viewport` as `IViewport` (only `width`/`height`), but at runtime it's a `ScaledViewport` with `scale`. We cast to access it safely, defaulting to 1 when absent.

- [ ] **Step 2: Verify build compiles**

Run: `npm run webpack:build`
Expected: Clean compile. The `ContainerViewport` type already has `scale?: number`.

- [ ] **Step 3: Commit**

```
feat: capture viewport scale from Power BI ScaledViewport
```

---

### Task 3: Add `scaleToZoom` to Power BI persistence layer

Follow the established `stateManagement` persistence pattern (same as `denebMetaVersion`).

**Files:**
- Modify: `capabilities.json:317-336`
- Modify: `src/lib/persistence/model/constants.ts:32-49`
- Modify: `src/lib/persistence/model/settings-state-management.ts:13-32`
- Modify: `stringResources/en-US/resources.resjson`

- [ ] **Step 1: Add property to capabilities.json**

In `capabilities.json`, inside `stateManagement.properties` (after `denebMetaVersion`), add:

```json
                "scaleToZoom": {
                    "type": { "text": true }
                }
```

- [ ] **Step 2: Add default to constants**

In `src/lib/persistence/model/constants.ts`, add to `DEFAULTS.stateManagement` (after `denebMetaVersion`):

```typescript
        /**
         * Persisted scale-to-zoom setting (canvas DPI compensation).
         */
        scaleToZoom: ''
```

- [ ] **Step 3: Add property to settings model class**

In `src/lib/persistence/model/settings-state-management.ts`, add to `SettingsStateManagementGroupProjectMetadata` (after the `denebMetaVersion` property):

```typescript
    scaleToZoom = new formattingSettings.ReadOnlyText({
        name: 'scaleToZoom',
        displayNameKey: 'Objects_StateManagement_ScaleToZoom',
        descriptionKey: 'Objects_StateManagement_ScaleToZoom_Description',
        value: DEFAULTS.stateManagement.scaleToZoom
    });
    slices = [this.supportFieldConfiguration, this.denebMetaVersion, this.scaleToZoom];
```

Note: The `slices` array assignment replaces the existing one at line 31.

- [ ] **Step 4: Add i18n keys for Power BI property pane**

In `stringResources/en-US/resources.resjson`, add after the `Objects_StateManagement_DenebMetaVersion_Description` entry:

```json
    "Objects_StateManagement_ScaleToZoom": "Scale to zoom",
    "Objects_StateManagement_ScaleToZoom_Description": "Persisted canvas DPI compensation setting.",
```

- [ ] **Step 5: Verify build compiles**

Run: `npm run webpack:build`
Expected: Clean compile.

- [ ] **Step 6: Commit**

```
feat: add scaleToZoom to Power BI stateManagement persistence
```

---

### Task 4: Add `scaleToZoom` to project type, state, and sync mapping

**Files:**
- Modify: `packages/app-core/src/lib/project/types.ts`
- Modify: `packages/app-core/src/state/project.ts:19-35,85-105`
- Modify: `src/lib/state/project-sync-mappings.ts:11-19,143-162`

- [ ] **Step 1: Add to DenebProject type**

In `packages/app-core/src/lib/project/types.ts`, add after `denebMetaVersion`:

```typescript
    scaleToZoom: boolean;
```

- [ ] **Step 2: Add setter to ProjectSliceProperties**

In `packages/app-core/src/state/project.ts`, add to the `ProjectSliceProperties` type (after `setDenebMetaVersion`):

```typescript
        setScaleToZoom: (scaleToZoom: boolean) => void;
```

- [ ] **Step 3: Add to ProjectSyncKey exclusion list**

In `src/lib/state/project-sync-mappings.ts`, add `'setScaleToZoom'` to the `ProjectSyncKey` exclusion:

```typescript
type ProjectSyncKey = keyof Omit<
    ProjectSliceProperties,
    | '__hasHydrated__'
    | '__isInitialized__'
    | 'syncProjectData'
    | 'setLogLevel'
    | 'setProvider'
    | 'setRenderMode'
    | 'setScaleToZoom'
>;
```

- [ ] **Step 4: Add initial state and setter to createProjectSlice**

In `packages/app-core/src/state/project.ts`, add to the initial state object (after `denebMetaVersion: 0`):

```typescript
            scaleToZoom: false,
```

Add the setter action (after `setDenebMetaVersion`):

```typescript
            setScaleToZoom: (scaleToZoom: boolean) =>
                set(
                    (state) => ({
                        project: {
                            ...state.project,
                            scaleToZoom
                        }
                    }),
                    false,
                    'project.setScaleToZoom'
                ),
```

- [ ] **Step 5: Add sync mapping entry**

In `src/lib/state/project-sync-mappings.ts`, add after the `denebMetaVersion` mapping:

```typescript
    {
        sliceKey: 'scaleToZoom',
        getVisualValue: (s) => {
            const raw =
                s.stateManagement.projectMetadata?.scaleToZoom?.value;
            return raw === 'true';
        },
        persistence: {
            objectName: 'stateManagement',
            propertyName: 'scaleToZoom'
        },
        onPersist: (value) => [
            {
                objectName: 'stateManagement',
                propertyName: 'scaleToZoom',
                value: String(value)
            }
        ]
    }
```

- [ ] **Step 6: Run tests**

Run: `npm run test`
Expected: All pass.

- [ ] **Step 7: Commit**

```
feat: add scaleToZoom to project type, state, and sync mapping
```

---

### Task 5: Wire scaleFactor into compilation

When `scaleToZoom` is enabled and renderer is canvas, pass the viewport `scale` as Vega's `scaleFactor` embed option. Scale changes should trigger recompilation when the feature is enabled.

**Files:**
- Modify: `packages/vega-runtime/src/lib/compilation/__tests__/embed-options.test.ts`
- Modify: `packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx:66-111,298-326`

- [ ] **Step 1: Add test for scaleFactor in embed options**

In `packages/vega-runtime/src/lib/compilation/__tests__/embed-options.test.ts`, add:

```typescript
    it('should pass scaleFactor through userOptions', () => {
        const input: BuildEmbedOptionsInput = {
            mode: 'vega',
            userOptions: { renderer: 'canvas', scaleFactor: 1.5 }
        };

        const result = buildEmbedOptions(input);

        expect(result.renderer).toBe('canvas');
        expect(result.scaleFactor).toBe(1.5);
    });

    it('should not include scaleFactor when not provided', () => {
        const input: BuildEmbedOptionsInput = {
            mode: 'vega'
        };

        const result = buildEmbedOptions(input);

        expect(result.scaleFactor).toBeUndefined();
    });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run packages/vega-runtime/src/lib/compilation/__tests__/embed-options.test.ts`
Expected: PASS — `buildEmbedOptions` already merges `userOptions` via `mergician`, so `scaleFactor` flows through.

- [ ] **Step 3: Extract scaleToZoom and embedScale from state**

In `packages/app-core/src/components/visual-viewer/components/visual-viewer.tsx`, add to the `useDenebState` selector:

```typescript
        renderMode: state.project.renderMode,
        scaleToZoom: state.project.scaleToZoom,
        embedScale: state.interface.embedViewport?.scale ?? 1,
```

Add `scaleToZoom` and `embedScale` to the destructured variables.

- [ ] **Step 4: Compute scaleFactor for embed options**

After the `useDenebState` hook, add a memoized computation:

```typescript
    const embedScaleFactor = useMemo(() => {
        if (scaleToZoom && renderMode === 'canvas' && embedScale !== 1) {
            return embedScale;
        }
        return undefined;
    }, [scaleToZoom, renderMode, embedScale]);
```

- [ ] **Step 5: Pass scaleFactor to all compileSpec calls**

Update all three `compileSpec()` call sites to include `scaleFactor`:

```typescript
            embedOptions: {
                renderer: renderMode as Renderers,
                ...(embedScaleFactor !== undefined && { scaleFactor: embedScaleFactor })
            }
```

- [ ] **Step 6: Add embedScale to the compilation trigger dependency array**

In the main compilation `useEffect` dependency array, add `embedScaleFactor`:

```typescript
    }, [
        spec,
        config,
        provider,
        renderMode,
        embedScaleFactor,
        viewportHeight,
        viewportWidth,
        logLevel,
        schemaValidator
    ]);
```

This ensures that when `scaleToZoom` is enabled and the scale changes, a recompilation is triggered. When `scaleToZoom` is disabled, `embedScaleFactor` stays `undefined` so scale changes don't trigger recompilation.

- [ ] **Step 7: Verify build compiles**

Run: `npm run webpack:build`
Expected: Clean compile.

- [ ] **Step 8: Commit**

```
feat(app-core): wire scaleFactor into compilation when scaleToZoom enabled
```

---

### Task 6: Add Settings UI toggle and i18n keys

Add a "Scale to report zoom level" switch in the General section of the settings pane, disabled when renderer is SVG.

**Files:**
- Modify: `packages/app-core/src/features/settings-pane/components/general-settings.tsx`
- Modify: `packages/app-core/src/features/settings-pane/components/settings-pane.tsx`
- Modify: `packages/app-core/src/i18n/en-US.json`

- [ ] **Step 1: Add i18n keys**

In `packages/app-core/src/i18n/en-US.json`, add:

```json
    "Text_Setting_ScaleToZoom": "Scale to report zoom level",
    "Assistive_Text_ScaleToZoom": "When enabled and using canvas rendering, Deneb adjusts the canvas resolution to match the Power BI report zoom level. This produces sharper output at non-100% zoom but uses more memory. Only applies to canvas rendering mode."
```

- [ ] **Step 2: Create the ScaleToZoomSettings component**

In `packages/app-core/src/features/settings-pane/components/general-settings.tsx`, add the following imports at the top (merge with existing):

```typescript
import {
    Field,
    InfoLabel,
    Radio,
    RadioGroup,
    RadioGroupOnChangeData,
    Switch
} from '@fluentui/react-components';
```

Add after the `RenderModeSettings` component (after line 128):

```typescript
export const ScaleToZoomSettings = () => {
    const { scaleToZoom, renderMode, setScaleToZoom, translate } =
        useDenebState((state) => ({
            scaleToZoom: state.project.scaleToZoom,
            renderMode: state.project.renderMode,
            setScaleToZoom: state.project.setScaleToZoom,
            translate: state.i18n.translate
        }));
    const tooltipMountNode = useSettingsPaneTooltip();
    const isCanvas = renderMode === 'canvas';
    const onChange = useCallback(
        (_ev: unknown, data: { checked: boolean }) =>
            setScaleToZoom(data.checked),
        [setScaleToZoom]
    );
    return (
        <Field
            label={
                <InfoLabel
                    info={translate('Assistive_Text_ScaleToZoom')}
                    infoButton={{
                        inline: false,
                        popover: { mountNode: tooltipMountNode }
                    }}
                >
                    {translate('Text_Setting_ScaleToZoom')}
                </InfoLabel>
            }
        >
            <Switch
                checked={scaleToZoom}
                onChange={onChange}
                disabled={!isCanvas}
            />
        </Field>
    );
};
```

- [ ] **Step 3: Add to settings pane**

In `packages/app-core/src/features/settings-pane/components/settings-pane.tsx`, import the new component and add it after `RenderModeSettings` in the General accordion section:

```typescript
import {
    ProviderSettings,
    RenderModeSettings,
    ScaleToZoomSettings
} from './general-settings';
```

Add `<ScaleToZoomSettings />` after `<RenderModeSettings />` in the General accordion item's children.

- [ ] **Step 4: Verify build compiles**

Run: `npm run webpack:build`
Expected: Clean compile.

- [ ] **Step 5: Manual test**

1. Open settings pane → General section
2. With SVG selected: "Scale to report zoom level" switch should be disabled
3. Switch to Canvas: the switch should become enabled
4. Toggle on → change report zoom → visual should re-render at higher resolution
5. Toggle off → change report zoom → visual renders as before (may be blurry at high zoom)

- [ ] **Step 6: Run tests**

Run: `npm run test`
Expected: All pass.

- [ ] **Step 7: Commit**

```
feat(app-core): add 'Scale to report zoom level' toggle in General settings
```

---

## Verification

1. **Renderer regression fixed**: Switch to canvas in settings → visual renders as `<canvas>` element (not `<svg>`)
2. **SVG still works**: Switch to SVG → visual renders as `<svg>` element
3. **Setting disabled when SVG**: Scale toggle grayed out when renderer is SVG
4. **Scale at 100%**: Canvas at 100% zoom, feature on → no visible difference (scaleFactor = 1)
5. **Scale at >100%**: Canvas at 150%+ zoom, feature on → crisp output; feature off → blurry
6. **Scale at <100%**: Canvas at 50% zoom, feature on → still crisp
7. **Persistence**: Toggle on, save report, reopen → setting preserved
8. **Recompilation trigger**: Feature on, change zoom → visual re-renders immediately
9. **No recompilation when off**: Feature off, change zoom → no re-render
10. `npm run test` — all suites pass
11. `npm run eslint` — all packages clean
