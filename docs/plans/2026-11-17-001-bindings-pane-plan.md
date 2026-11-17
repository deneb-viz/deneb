# Bindings Pane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Vega's generated binding form with a pane that Deneb renders itself, so bound controls match the report, take their own space, and keep their values when the view is rebuilt.

**Architecture:** At compile time `parseSpec` records the top-level signals that have an input binding. At embed time a `patch` function passed to vega-embed switches Vega's form off and seeds each bound signal with its held value. At runtime a pane in app-core's viewer renders one Fluent control per bound signal and talks to the view through `view.signal()` and signal listeners. Held values live in the store, tagged with the definition they were captured under.

**Tech Stack:** TypeScript 5.6, React 19, Fluent UI v9, Zustand, Vega 6, Vega-Lite 6, vega-embed 7, Vitest 4.

**Spec:** [docs/brainstorms/2026-11-17-bindings-pane-requirements.md](../brainstorms/2026-11-17-bindings-pane-requirements.md). Read it before starting.

---

## Execution notes

**Part 1 was executed on 2026-11-17**, on `feat/346-bindings-pane`. Tasks 1 to 12 below are the plan as it was written, not the code as it was built. Where they differ, the branch is right. A review of the finished branch found four defects in the planned design, and they were fixed before the branch was handed over. The requirements document has a matching section.

### What was built differently

| Area                                     | As built                                                                                                                                                                                                                    | Why                                                                                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Held values on a new view                | Not seeded into the spec. `handleEmbed` calls `bindEmbeddedView`, which writes them in a `runAsync` prerun straight after the view's first run. The embed patch only switches Vega's form off.                              | Vega skips signal-triggered handlers on a view's first run. A seeded Vega-Lite selection showed one value in its control and filtered by another.                                         |
| Which definitions the pane attaches with | The bound signals recorded for the view when its spec was patched (`getViewBoundSignals(view)`), not the parse result's. The hook is `useBoundSignalSession(isActive)`.                                                     | Attached to a stale view, it recorded old values under an edited signal's new definition, so an edited default never took effect.                                                         |
| Bindings from the spec                   | `getBoundSignals` returns a sanitised copy of each binding: `name` only as text, `options` and `labels` only as arrays. `getBindingLabel` always returns text.                                                              | An object in `bind.name` reached a Fluent slot as component properties, which could load an external address from the certified visual. A non-array `options` stopped the pane rendering. |
| A pane that throws                       | The pane is wrapped in `VegaEmbedErrorBoundary`, keyed by the definitions.                                                                                                                                                  | A value that cannot be converted to text must hide the pane, not take the chart down.                                                                                                     |
| Writes to the view                       | Every write sets its signal in a `runAsync` prerun, as Vega's `bind.js` does, through a local type because vega-typings declares `runAsync()` with no parameters.                                                           | A signal set directly while a run is paused on a data load is lost.                                                                                                                       |
| Shared helpers                           | `isRecord` and `hasOwn` are in `spec-processing/object-guards.ts`.                                                                                                                                                          | Four modules use them, and they are not about bound signals.                                                                                                                              |
| Control rules                            | `binding-controls.ts` also has `getOptionAtIndex`, `getColorInputValue` and the `BindingInputType` union. `d3-color` is a direct dependency beside `d3-array`.                                                              | The value each control writes is pinned by tests, and a colour control shows a named colour as itself instead of black.                                                                   |
| Select with no match                     | It renders an empty option when the signal's value matches none.                                                                                                                                                            | It otherwise showed the first option as if it were the value.                                                                                                                             |
| Pane                                     | One root and one toggle for both states.                                                                                                                                                                                    | Two separate trees destroyed the focused toggle, which dropped keyboard focus.                                                                                                            |
| Names                                    | `bindings-embed.ts`, not `bindings-embed-patch.ts`. `getApplicableHeldValues`, not `getSeedValues`.                                                                                                                         | The module no longer only patches, and nothing is seeded.                                                                                                                                 |
| Layout after a write                     | After a write, if the room the drawn content needs has changed, the layout is recomputed with `view.resize()` until the content fits, once per burst of writes. `getRoomNeeded` measures room as Vega's `layoutGroup` does. | Vega lays a view out once and does not revisit it when a signal changes what is drawn. Found in Desktop testing: a filtered bar's label pushed the title out of view.                     |

### Before starting Part 2

- **Task 13** imports `hasOwn` and `isRecord` from `./object-guards`. This is corrected below.
- **Task 16** replaces the pane. Its code block predates the changes above and must be rewritten before it is used. The new pane must keep one root and one toggle in a fixed child position for every `orient`, call `useBoundSignalSession(isActive)`, stay inside the error boundary in `visual-viewer.tsx`, and keep every existing canary assertion passing.
- Read `bindings-pane-wiring.test.ts` as it stands on `main` before writing Part 2's canary steps. It has more blocks than this plan expects.

### Environment facts found during execution

- Vitest fails every file with "Cannot read properties of undefined (reading 'config')" when the working directory has a lower-case drive letter. Run from `C:\Repos\deneb`, not `c:\Repos\deneb`.
- `npm run typecheck -w @deneb-viz/app-core` reports one error that predates this work: `deneb-platform-provider.tsx`, `Cannot find namespace 'JSX'`. CI does not run that script.
- ESLint ignores package files when run from the repository root. Use `npm exec -w <package> -- eslint <paths relative to the package>`.
- `npm run package` writes to the repository root's `dist/`.
- Do not run `npm run ci:local` while a dev server is running against the same checkout. It rebuilds every package and swaps `.env` for the duration.
- The web sample app (`apps/web-client-sample`) runs the editor in a browser without Power BI. With a spec loaded through `getDenebState().project.initializeFromTemplate(...)`, it is a quick way to check the pane.

## Before you start

**Three parts, three pull requests.** Each part is its own branch cut from an up-to-date `main`, and each merges before the next starts.

| Part | Branch                          | Delivers                                      | Closes |
| ---- | ------------------------------- | --------------------------------------------- | ------ |
| 1    | `feat/346-bindings-pane`        | The engine and the pane with default settings | #346   |
| 2    | `feat/275-bindings-settings`    | The `deneb.bindings` config key               | #275   |
| 3    | `feat/275-config-editor-schema` | Completion for the config editor              | none   |

**Build order matters.** app-core and editor consume `@deneb-viz/vega-runtime` from its built `dist`, and editor consumes app-core the same way. After changing anything under `packages/vega-runtime`, run this before any app-core or editor test or type check:

```bash
npm run build -w @deneb-viz/vega-runtime
```

After changing app-core, run `npm run build -w @deneb-viz/app-core` before editor tests.

**Running one test file.** This form runs without coverage:

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/spec-processing/__tests__/bound-signals.test.ts
```

`npm run test -w @deneb-viz/vega-runtime` runs the whole package with coverage. Files under `src/lib/spec-processing/` must stay at or above 90% for lines, functions, branches and statements, so do not trim the tests in this plan.

**app-core has no component-render tests.** Its Vitest runs in node, with no DOM and no testing-library. Do not add render tests. Logic goes in plain functions that are tested directly, and wiring is pinned by tests that read the source text. This plan follows that pattern.

**Code rules from `CLAUDE.md`.** Comments and test names describe what the code does now. Do not mention this plan, task numbers, pull requests or the spec in code or test names. Prefer readable code over compact code.

**Formatting.** After editing, run `npx prettier --write` on the files you changed.

**Commits.** Conventional Commits with a package scope and the issue number, for example `feat(vega-runtime): extract bound signals from compiled specs (#346)`.

**Before each pull request,** run `npm run ci:local`. It mirrors CI.

**Fluent UI needs no update.** Every component used here exists in the installed version (9.73.6; latest is 9.75.2). Refresh Fluent as a separate chore so the bundle measurement in this plan stays attributable.

## File map

**Part 1**

| File                                                                              | Change | Responsibility                                                    |
| --------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `packages/vega-runtime/src/lib/spec-processing/bound-signals.ts`                  | create | Bound-signal and held-value types; extraction; held-value lookups |
| `packages/vega-runtime/src/lib/spec-processing/patch-bindings.ts`                 | create | The embed-time patch                                              |
| `packages/vega-runtime/src/lib/spec-processing/binding-controls.ts`               | create | Vega's rules for each kind of control                             |
| `packages/vega-runtime/src/lib/spec-processing/types.ts`                          | modify | `ParsedSpec.boundSignals`                                         |
| `packages/vega-runtime/src/lib/spec-processing/parse.ts`                          | modify | Record bound signals during validation                            |
| `packages/vega-runtime/src/lib/spec-processing/index.ts`                          | modify | Exports                                                           |
| `packages/vega-runtime/src/lib/view/bound-signal-session.ts`                      | create | Attach bound signals to a view                                    |
| `packages/vega-runtime/src/lib/view/index.ts`                                     | modify | Exports                                                           |
| `packages/vega-runtime/package.json`                                              | modify | `d3-array` dependency                                             |
| `packages/app-core/src/state/bindings.ts`                                         | create | Held values and collapsed state                                   |
| `packages/app-core/src/state/state.ts`, `index.ts`                                | modify | Install the slice                                                 |
| `packages/app-core/src/features/visual-viewer/bindings-embed-patch.ts`            | create | The function passed as vega-embed's `patch`                       |
| `packages/app-core/src/features/visual-viewer/components/vega-embed.tsx`          | modify | Pass `patch`                                                      |
| `packages/app-core/src/features/visual-viewer/components/bindings-pane/*`         | create | The pane, one control, and the session hook                       |
| `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx`       | modify | Layout                                                            |
| `packages/app-core/src/i18n/en-US.json`                                           | modify | Three strings                                                     |
| `apps/deneb/style/visual.less`, `apps/viewer/style/visual.less`                   | modify | Delete the old binding styles                                     |
| `docs/plans/2026-07-23-001-container-signal-consolidation-design.md`, `CLAUDE.md` | modify | Documentation                                                     |

**Part 2**

| File                                                                                      | Change | Responsibility                               |
| ----------------------------------------------------------------------------------------- | ------ | -------------------------------------------- |
| `packages/vega-runtime/src/lib/spec-processing/bindings-settings.ts`                      | create | Read and validate `deneb.bindings`           |
| `packages/vega-runtime/src/lib/spec-processing/types.ts`, `parse.ts`, `index.ts`          | modify | `ParsedSpec.bindingsSettings`; strip `deneb` |
| `packages/app-core/src/lib/interface/bindings-theme.ts`                                   | create | Style settings to a Fluent theme             |
| `packages/app-core/src/features/visual-viewer/bindings-pane-state.ts`                     | create | Resolve the collapsed state                  |
| `packages/app-core/src/state/bindings.ts`                                                 | modify | Collapse choice tagged with its setting      |
| `packages/app-core/src/features/visual-viewer/components/bindings-pane/bindings-pane.tsx` | modify | Orient, float, collapse and style            |
| `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx`               | modify | Layout per orient                            |

**Part 3**

| File                                                           | Change | Responsibility                     |
| -------------------------------------------------------------- | ------ | ---------------------------------- |
| `packages/editor/src/lib/schema/deneb-config-schema.ts`        | create | JSON schema for the `deneb` key    |
| `packages/editor/src/lib/schema/schema-service.ts`, `index.ts` | modify | Build config schemas               |
| `packages/editor/src/lib/monaco/editor-init-service.ts`        | modify | Register them for Config documents |

---

# Part 1: the engine and the pane

```bash
git checkout main && git pull && git checkout -b feat/346-bindings-pane
```

### Task 1: Extract bound signals

A bound signal is a top-level signal whose `bind` has an `input`. Vega rejects `bind` on nested signals, so only the top level is searched. Each bound signal carries a `key` that identifies its definition; a held value is tagged with that key and is ignored once the definition changes.

**Files:**

- Create: `packages/vega-runtime/src/lib/spec-processing/bound-signals.ts`
- Test: `packages/vega-runtime/src/lib/spec-processing/__tests__/bound-signals.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/vega-runtime/src/lib/spec-processing/__tests__/bound-signals.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Spec } from 'vega';
import { compile, type TopLevelSpec } from 'vega-lite';

import {
    getBoundSignals,
    getHeldValue,
    getSeedValues,
    type BoundSignal,
    type HeldBoundValues
} from '../bound-signals';

const VEGA_SPEC = {
    signals: [
        { name: 'plain', value: 1 },
        { name: 'slider', value: 5, bind: { input: 'range', min: 0, max: 10 } },
        {
            name: 'chosen',
            init: "'a'",
            bind: { input: 'select', options: ['a', 'b'] }
        },
        { name: 'derived', update: 'slider * 2', bind: { input: 'range' } },
        { name: 'direct', bind: { element: '#external' } }
    ]
} as unknown as Spec;

const VEGA_LITE_DATA = {
    values: [
        { o: 'Europe', c: 4, y: 1 },
        { o: 'Japan', c: 6, y: 2 }
    ]
};

const compileVegaLite = (spec: unknown): Spec =>
    compile(spec as TopLevelSpec).spec;

const namesOf = (boundSignals: BoundSignal[]) =>
    boundSignals.map((boundSignal) => boundSignal.name);

describe('getBoundSignals', () => {
    it('returns the signals whose bind has an input, in spec order', () => {
        expect(namesOf(getBoundSignals(VEGA_SPEC))).toEqual([
            'slider',
            'chosen',
            'derived'
        ]);
    });

    it('records value, init and update as written', () => {
        const [slider, chosen, derived] = getBoundSignals(VEGA_SPEC);
        expect(slider).toMatchObject({
            value: 5,
            bind: { input: 'range', min: 0, max: 10 }
        });
        expect(slider).not.toHaveProperty('init');
        expect(slider).not.toHaveProperty('update');
        expect(chosen).toMatchObject({ init: "'a'" });
        expect(chosen).not.toHaveProperty('value');
        expect(derived).toMatchObject({ update: 'slider * 2' });
    });

    it('returns nothing for a spec without a signals array', () => {
        expect(getBoundSignals({} as Spec)).toEqual([]);
        expect(getBoundSignals({ signals: 'none' } as unknown as Spec)).toEqual(
            []
        );
    });

    it('skips entries that are not bound signal definitions', () => {
        const spec = {
            signals: [
                null,
                'text',
                { bind: { input: 'range' } },
                { name: 7, bind: { input: 'range' } },
                { name: 'legend', bind: 'legend' },
                { name: 'kept', bind: { input: 'checkbox' } }
            ]
        } as unknown as Spec;
        expect(namesOf(getBoundSignals(spec))).toEqual(['kept']);
    });

    it('gives equal definitions the same key and changed definitions a different key', () => {
        const withBind = (bind: object, value: unknown) =>
            getBoundSignals({
                signals: [{ name: 'slider', value, bind }]
            } as unknown as Spec)[0].key;
        const original = withBind({ input: 'range', max: 10 }, 5);
        expect(withBind({ input: 'range', max: 10 }, 5)).toBe(original);
        expect(withBind({ input: 'range', max: 20 }, 5)).not.toBe(original);
        expect(withBind({ input: 'range', max: 10 }, 6)).not.toBe(original);
    });

    it('finds parameter and selection inputs in compiled Vega-Lite and ignores a legend binding', () => {
        const compiled = compileVegaLite({
            data: VEGA_LITE_DATA,
            params: [
                {
                    name: 'opacityVal',
                    value: 0.5,
                    bind: { input: 'range', min: 0, max: 1, step: 0.1 }
                },
                { name: 'showLabels', value: true, bind: { input: 'checkbox' } }
            ],
            layer: [
                {
                    params: [
                        {
                            name: 'org',
                            select: { type: 'point', fields: ['o'] },
                            bind: {
                                input: 'select',
                                options: [null, 'Europe', 'Japan']
                            }
                        },
                        {
                            name: 'legendSel',
                            select: { type: 'point', fields: ['o'] },
                            bind: 'legend'
                        }
                    ],
                    mark: 'point',
                    encoding: {
                        x: { field: 'c', type: 'quantitative' },
                        y: { field: 'y', type: 'quantitative' },
                        color: { field: 'o', type: 'nominal' }
                    }
                }
            ]
        });
        expect(namesOf(getBoundSignals(compiled))).toEqual([
            'org_o',
            'opacityVal',
            'showLabels'
        ]);
    });

    it('finds one bound signal for each projected field of a selection', () => {
        const compiled = compileVegaLite({
            data: VEGA_LITE_DATA,
            params: [
                {
                    name: 'pick',
                    select: { type: 'point', fields: ['c', 'y'] },
                    bind: {
                        c: { input: 'range', min: 0, max: 10, step: 1 },
                        y: { input: 'range', min: 0, max: 5, step: 1 }
                    }
                }
            ],
            mark: 'point',
            encoding: {
                x: { field: 'c', type: 'quantitative' },
                y: { field: 'y', type: 'quantitative' }
            }
        });
        expect(namesOf(getBoundSignals(compiled)).sort()).toEqual([
            'pick_c',
            'pick_y'
        ]);
    });

    it('records init for a Vega-Lite selection that has an initial value', () => {
        const compiled = compileVegaLite({
            data: VEGA_LITE_DATA,
            params: [
                {
                    name: 'org',
                    value: [{ o: 'Japan' }],
                    select: { type: 'point', fields: ['o'] },
                    bind: {
                        input: 'select',
                        options: [null, 'Europe', 'Japan']
                    }
                }
            ],
            mark: 'point',
            encoding: {
                x: { field: 'c', type: 'quantitative' },
                y: { field: 'y', type: 'quantitative' }
            }
        });
        const [org] = getBoundSignals(compiled);
        expect(org.name).toBe('org_o');
        expect(org.init).toBe('"Japan"');
        expect(org).not.toHaveProperty('value');
    });
});

describe('getHeldValue', () => {
    const [slider, chosen] = getBoundSignals(VEGA_SPEC);

    it('returns the held value when it was captured under this definition', () => {
        const held: HeldBoundValues = { slider: { key: slider.key, value: 8 } };
        expect(getHeldValue(slider, held)).toBe(8);
    });

    it('returns a held null rather than falling back', () => {
        const held: HeldBoundValues = {
            slider: { key: slider.key, value: null }
        };
        expect(getHeldValue(slider, held)).toBeNull();
    });

    it('falls back to the definition value when the held key differs', () => {
        const held: HeldBoundValues = { slider: { key: 'other', value: 8 } };
        expect(getHeldValue(slider, held)).toBe(5);
    });

    it('returns undefined when nothing is held and the definition has no value', () => {
        expect(getHeldValue(chosen, {})).toBeUndefined();
    });
});

describe('getSeedValues', () => {
    const boundSignals = getBoundSignals({
        signals: [
            { name: 'a', value: 1, bind: { input: 'range' } },
            { name: 'b', value: true, bind: { input: 'checkbox' } },
            { name: 'c', value: 'x', bind: { input: 'text' } },
            { name: 'constructor', value: 1, bind: { input: 'range' } }
        ]
    } as unknown as Spec);
    const [a, b, c] = boundSignals;

    it('includes held values captured under the current definitions, however falsy', () => {
        const held: HeldBoundValues = {
            a: { key: a.key, value: 0 },
            b: { key: b.key, value: false },
            c: { key: c.key, value: null }
        };
        expect(getSeedValues(boundSignals, held)).toEqual({
            a: 0,
            b: false,
            c: null
        });
    });

    it('leaves out held values with another key and names that are not bound', () => {
        const held: HeldBoundValues = {
            a: { key: 'stale', value: 9 },
            unknown: { key: a.key, value: 9 }
        };
        expect(getSeedValues(boundSignals, held)).toEqual({});
    });

    it('does not treat an inherited property as a held value', () => {
        expect(getSeedValues(boundSignals, {})).toEqual({});
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/spec-processing/__tests__/bound-signals.test.ts
```

Expected: FAIL. The message names `../bound-signals` as a module that cannot be found.

- [ ] **Step 3: Write the implementation**

Create `packages/vega-runtime/src/lib/spec-processing/bound-signals.ts`:

```ts
import type { Spec } from 'vega';

/**
 * A Vega input binding that asks for a generated control: a `bind` with an
 * `input` type. Property names are Vega's own.
 */
export type BoundSignalBinding = {
    input: string;
    name?: string;
    debounce?: number;
    options?: unknown[];
    labels?: string[];
    min?: number;
    max?: number;
    step?: number;
    [property: string]: unknown;
};

/**
 * A top-level signal that Deneb renders a control for.
 */
export type BoundSignal = {
    name: string;
    bind: BoundSignalBinding;
    /** The signal's initial `value`, when the spec gives one. */
    value?: unknown;
    /** The signal's `init` expression, when the spec gives one. */
    init?: string;
    /** The signal's `update` expression, when the spec gives one. */
    update?: string;
    /**
     * Identifies this definition. Two bound signals share a key only when
     * their `bind`, `value`, `init` and `update` are all equal, so a value
     * captured under one key is never applied to a redefined signal.
     */
    key: string;
};

/**
 * The last-known value of a bound signal, tagged with the definition it was
 * captured under.
 */
export type HeldBoundValue = {
    key: string;
    value: unknown;
};

export type HeldBoundValues = Record<string, HeldBoundValue>;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export const hasOwn = (target: object, property: string): boolean =>
    Object.prototype.hasOwnProperty.call(target, property);

/**
 * List the signals of a Vega spec that have a generated input binding, in
 * spec order. Vega only allows `bind` on top-level signals, so nested scopes
 * are not searched. For Vega-Lite, pass the compiled Vega spec.
 */
export const getBoundSignals = (spec: Spec): BoundSignal[] => {
    const signals: unknown = (spec as { signals?: unknown }).signals;
    if (!Array.isArray(signals)) {
        return [];
    }
    const boundSignals: BoundSignal[] = [];
    for (const signal of signals) {
        if (!isRecord(signal) || typeof signal.name !== 'string') {
            continue;
        }
        const bind = signal.bind;
        if (!isRecord(bind) || typeof bind.input !== 'string') {
            continue;
        }
        const definition = {
            bind: bind as BoundSignalBinding,
            ...(signal.value !== undefined && { value: signal.value }),
            ...(typeof signal.init === 'string' && { init: signal.init }),
            ...(typeof signal.update === 'string' && {
                update: signal.update
            })
        };
        boundSignals.push({
            name: signal.name,
            ...definition,
            key: JSON.stringify(definition)
        });
    }
    return boundSignals;
};

/**
 * The held entry for a bound signal, if one was captured under its current
 * definition.
 */
const getApplicableHeldEntry = (
    boundSignal: BoundSignal,
    heldValues: HeldBoundValues
): HeldBoundValue | undefined => {
    if (!hasOwn(heldValues, boundSignal.name)) {
        return undefined;
    }
    const held = heldValues[boundSignal.name];
    return held.key === boundSignal.key ? held : undefined;
};

/**
 * The value a control should show: the held value when one was captured
 * under this definition, otherwise the definition's own `value`. Undefined
 * when the signal has neither.
 */
export const getHeldValue = (
    boundSignal: BoundSignal,
    heldValues: HeldBoundValues
): unknown => {
    const held = getApplicableHeldEntry(boundSignal, heldValues);
    return held === undefined ? boundSignal.value : held.value;
};

/**
 * The held values that still apply, by signal name. A held `null`, `false`
 * or `0` is included: the test is whether a value is held, not whether it is
 * truthy.
 */
export const getSeedValues = (
    boundSignals: BoundSignal[],
    heldValues: HeldBoundValues
): Record<string, unknown> => {
    const seedValues: Record<string, unknown> = {};
    for (const boundSignal of boundSignals) {
        const held = getApplicableHeldEntry(boundSignal, heldValues);
        if (held !== undefined) {
            seedValues[boundSignal.name] = held.value;
        }
    }
    return seedValues;
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/spec-processing/__tests__/bound-signals.test.ts
```

Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/vega-runtime/src/lib/spec-processing/bound-signals.ts packages/vega-runtime/src/lib/spec-processing/__tests__/bound-signals.test.ts
git commit -m "feat(vega-runtime): extract bound signals from compiled specs (#346)"
```

### Task 2: The embed-time patch

vega-embed calls its `patch` option with the compiled Vega spec, for Vega and Vega-Lite alike, before the spec is parsed. The patch does two things: it sets `config.events.bind` to `'none'` so Vega builds no form, and it seeds signals with held values. It must copy, never mutate, because the compiled template is reused across embeds.

**Files:**

- Create: `packages/vega-runtime/src/lib/spec-processing/patch-bindings.ts`
- Test: `packages/vega-runtime/src/lib/spec-processing/__tests__/patch-bindings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/vega-runtime/src/lib/spec-processing/__tests__/patch-bindings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parse, View, type Spec } from 'vega';

import { patchSpecForBindings } from '../patch-bindings';

const createSpec = () =>
    ({
        config: { background: 'white', events: { defaults: { allow: [] } } },
        signals: [
            { name: 'plain', value: 1 },
            { name: 'slider', value: 5, bind: { input: 'range' } },
            {
                name: 'chosen',
                init: "'a'",
                bind: { input: 'select', options: ['a', 'b'] }
            },
            { name: 'derived', update: 'slider * 2', bind: { input: 'range' } }
        ],
        marks: []
    }) as unknown as Spec;

type LooseSpec = {
    config: { background?: string; events: Record<string, unknown> };
    signals: Record<string, unknown>[];
};

const loose = (spec: Spec) => spec as unknown as LooseSpec;

const runView = async (spec: Spec) => {
    const view = new View(parse(spec), { renderer: 'none' });
    await view.runAsync();
    return view;
};

describe('patchSpecForBindings', () => {
    it('switches input bindings off and keeps the rest of the config', () => {
        const patched = loose(patchSpecForBindings(createSpec(), {}));
        expect(patched.config.events.bind).toBe('none');
        expect(patched.config.events.defaults).toEqual({ allow: [] });
        expect(patched.config.background).toBe('white');
    });

    it('adds the config when the spec has none', () => {
        const patched = loose(
            patchSpecForBindings({ marks: [] } as unknown as Spec, {})
        );
        expect(patched.config.events).toEqual({ bind: 'none' });
    });

    it('does not mutate the spec it is given', () => {
        const spec = createSpec();
        const before = structuredClone(spec);
        patchSpecForBindings(spec, { slider: 9, chosen: 'b' });
        expect(spec).toEqual(before);
    });

    it('seeds a signal with its held value', () => {
        const patched = loose(
            patchSpecForBindings(createSpec(), { slider: 9 })
        );
        expect(patched.signals[1]).toMatchObject({ name: 'slider', value: 9 });
    });

    it('replaces init with the held value', () => {
        const patched = loose(
            patchSpecForBindings(createSpec(), { chosen: 'b' })
        );
        expect(patched.signals[2]).toMatchObject({
            name: 'chosen',
            value: 'b'
        });
        expect(patched.signals[2]).not.toHaveProperty('init');
    });

    it('leaves a signal with an update expression alone', () => {
        const spec = createSpec();
        const patched = loose(patchSpecForBindings(spec, { derived: 99 }));
        expect(patched.signals[3]).toBe(loose(spec).signals[3]);
    });

    it('applies a held null, false or zero', () => {
        const spec = {
            signals: [
                { name: 'a', value: 1 },
                { name: 'b', value: true },
                { name: 'c', value: 'x' }
            ]
        } as unknown as Spec;
        const patched = loose(
            patchSpecForBindings(spec, { a: 0, b: false, c: null })
        );
        expect(patched.signals.map((signal) => signal.value)).toEqual([
            0,
            false,
            null
        ]);
    });

    it('keeps the identity of signals it does not seed', () => {
        const spec = createSpec();
        const patched = loose(patchSpecForBindings(spec, { slider: 9 }));
        expect(patched.signals[0]).toBe(loose(spec).signals[0]);
        expect(patched.signals[2]).toBe(loose(spec).signals[2]);
    });

    it('passes over signal entries that are not definitions', () => {
        const spec = { signals: [null, 'text'] } as unknown as Spec;
        const patched = loose(patchSpecForBindings(spec, { slider: 9 }));
        expect(patched.signals).toEqual([null, 'text']);
    });

    it('gives a new view the held values on its first run', async () => {
        const view = await runView(
            patchSpecForBindings(createSpec(), { slider: 9, chosen: 'b' })
        );
        expect(view.signal('slider')).toBe(9);
        expect(view.signal('chosen')).toBe('b');
        expect(view.signal('derived')).toBe(18);
        view.finalize();
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/spec-processing/__tests__/patch-bindings.test.ts
```

Expected: FAIL. `../patch-bindings` cannot be found.

- [ ] **Step 3: Write the implementation**

Create `packages/vega-runtime/src/lib/spec-processing/patch-bindings.ts`:

```ts
import type { Spec } from 'vega';

import { hasOwn, isRecord } from './bound-signals';

/**
 * Give one signal its held value. A signal with an `update` expression is
 * returned untouched, because Vega re-evaluates the expression on every new
 * view. `init` is removed, because it would override `value`.
 */
const seedSignal = (
    signal: unknown,
    seedValues: Record<string, unknown>
): unknown => {
    if (
        !isRecord(signal) ||
        typeof signal.name !== 'string' ||
        !hasOwn(seedValues, signal.name) ||
        signal.update !== undefined
    ) {
        return signal;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { init, ...rest } = signal;
    return { ...rest, value: seedValues[signal.name] };
};

/**
 * Prepare a compiled Vega spec for controls that Deneb renders itself.
 *
 * - Sets `config.events.bind` to `'none'`, so Vega builds no binding form.
 * - Seeds each signal named in `seedValues` with that value.
 *
 * Returns a new spec. The input is never mutated: the compiled template it
 * comes from is reused across embeds.
 */
export const patchSpecForBindings = (
    spec: Spec,
    seedValues: Record<string, unknown>
): Spec => {
    const source = spec as unknown as Record<string, unknown>;
    const config = isRecord(source.config) ? source.config : {};
    const events = isRecord(config.events) ? config.events : {};
    const patched: Record<string, unknown> = {
        ...source,
        config: { ...config, events: { ...events, bind: 'none' } }
    };
    if (Array.isArray(source.signals)) {
        patched.signals = source.signals.map((signal: unknown) =>
            seedSignal(signal, seedValues)
        );
    }
    return patched as unknown as Spec;
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/spec-processing/__tests__/patch-bindings.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/vega-runtime/src/lib/spec-processing/patch-bindings.ts packages/vega-runtime/src/lib/spec-processing/__tests__/patch-bindings.test.ts
git commit -m "feat(vega-runtime): add the embed patch for Deneb-rendered bindings (#346)"
```

### Task 3: Record bound signals at compile time

`parseSpec` already parses a Vega spec and compiles a Vega-Lite spec to validate them, then discards the result. Take the bound signals from that step. They land on the compile result, which both viewer instances share and which exists before the first embed, so the pane's space can be reserved up front.

**Files:**

- Modify: `packages/vega-runtime/src/lib/spec-processing/types.ts`
- Modify: `packages/vega-runtime/src/lib/spec-processing/parse.ts`
- Modify: `packages/vega-runtime/src/lib/spec-processing/index.ts`
- Test: `packages/vega-runtime/src/lib/spec-processing/__tests__/parse.test.ts`

- [ ] **Step 1: Write the failing test**

Append this block to the end of `packages/vega-runtime/src/lib/spec-processing/__tests__/parse.test.ts`. The file already imports `parseSpec`.

```ts
describe('parseSpec bound signals', () => {
    const containerDimensions = { width: 400, height: 300 };

    it('records the bound signals of a Vega spec', () => {
        const result = parseSpec({
            spec: JSON.stringify({
                $schema: 'https://vega.github.io/schema/vega/v6.json',
                signals: [
                    { name: 'plain', value: 1 },
                    { name: 'slider', value: 5, bind: { input: 'range' } }
                ],
                marks: []
            }),
            provider: 'vega',
            containerDimensions
        });
        expect(result.status).toBe('valid');
        expect(result.boundSignals.map((signal) => signal.name)).toEqual([
            'slider'
        ]);
    });

    it('records the bound signals of a Vega-Lite spec from its compiled Vega', () => {
        const result = parseSpec({
            spec: JSON.stringify({
                data: { values: [{ a: 1 }] },
                params: [
                    {
                        name: 'opacityVal',
                        value: 0.5,
                        bind: { input: 'range', min: 0, max: 1 }
                    }
                ],
                mark: 'point',
                encoding: { x: { field: 'a', type: 'quantitative' } }
            }),
            provider: 'vegaLite',
            containerDimensions
        });
        expect(result.status).toBe('valid');
        expect(result.boundSignals.map((signal) => signal.name)).toEqual([
            'opacityVal'
        ]);
    });

    it('records no bound signals when the spec fails to parse', () => {
        const result = parseSpec({
            spec: '{ not json',
            provider: 'vega',
            containerDimensions
        });
        expect(result.status).toBe('error');
        expect(result.boundSignals).toEqual([]);
    });

    it('records no bound signals when the config fails to parse', () => {
        const result = parseSpec({
            spec: '{ "marks": [] }',
            config: '{ not json',
            provider: 'vega',
            containerDimensions
        });
        expect(result.status).toBe('error');
        expect(result.boundSignals).toEqual([]);
    });

    it('records no bound signals when validation fails', () => {
        const result = parseSpec({
            spec: JSON.stringify({
                signals: [
                    { name: 'slider', value: 5, bind: { input: 'range' } },
                    { name: 'slider', value: 1 }
                ],
                marks: []
            }),
            provider: 'vega',
            containerDimensions
        });
        expect(result.status).toBe('error');
        expect(result.boundSignals).toEqual([]);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/spec-processing/__tests__/parse.test.ts
```

Expected: FAIL in the new block. `result.boundSignals` is undefined.

- [ ] **Step 3: Add the field to `ParsedSpec`**

In `packages/vega-runtime/src/lib/spec-processing/types.ts`, add this import under the existing imports:

```ts
import type { BoundSignal } from './bound-signals';
```

In the `ParsedSpec` interface, add this member after `patchedDimensions`:

```ts
    /**
     * Top-level signals with a generated input binding, in spec order. For
     * Vega-Lite these come from the compiled Vega. Empty when parsing fails.
     */
    boundSignals: BoundSignal[];
```

- [ ] **Step 4: Record them in `parseSpec`**

In `packages/vega-runtime/src/lib/spec-processing/parse.ts`, add to the imports:

```ts
import { getBoundSignals, type BoundSignal } from './bound-signals';
```

Add `boundSignals: []` to both early error returns (the JSON parse error for the spec and for the config), after their `patchedDimensions` line:

```ts
            patchedDimensions: NO_PATCHED_DIMENSIONS,
            boundSignals: []
```

Replace the validation block and the final return with:

```ts
// Step 5: Validate patched spec with the appropriate compiler/parser.
// Vega: parse with Vega parser. VL: compile with vega-lite to catch conflicts
// introduced by patchVegaLiteSpec (e.g. duplicate param names like denebContainer).
// The same step yields the bound signals: Vega only allows `bind` on
// top-level signals, and Vega-Lite hoists every input binding there.
let boundSignals: BoundSignal[] = [];
try {
    if (provider === 'vega') {
        parseVega(specWithConfig as Spec);
        boundSignals = getBoundSignals(specWithConfig as Spec);
    } else {
        const compiled = compileVegaLite(specWithConfig as TopLevelSpec);
        boundSignals = getBoundSignals(compiled.spec);
    }
} catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const redactedMessage = redactJsonFromError(message);

    return {
        status: 'error',
        spec: null,
        config: parsedConfig.result,
        errors: [redactedMessage],
        warnings,
        patchedDimensions: NO_PATCHED_DIMENSIONS,
        boundSignals: []
    };
}

return {
    status: 'valid',
    spec: patchedSpec,
    config: parsedConfig.result,
    errors: [],
    warnings,
    patchedDimensions,
    boundSignals
};
```

- [ ] **Step 5: Export the new modules**

In `packages/vega-runtime/src/lib/spec-processing/index.ts`, add after the `patch-data` export block:

```ts
// Input bindings rendered by Deneb
export { getBoundSignals, getHeldValue, getSeedValues } from './bound-signals';
export { patchSpecForBindings } from './patch-bindings';
```

Add this statement at the end of the file:

```ts
export type {
    BoundSignal,
    BoundSignalBinding,
    HeldBoundValue,
    HeldBoundValues
} from './bound-signals';
```

- [ ] **Step 6: Run the vega-runtime tests**

```bash
npm run test -w @deneb-viz/vega-runtime
```

Expected: PASS, with the coverage thresholds met.

- [ ] **Step 7: Rebuild vega-runtime and confirm app-core is unaffected**

```bash
npm run build -w @deneb-viz/vega-runtime
npm run typecheck -w @deneb-viz/app-core
npm run test -w @deneb-viz/app-core
```

Expected: no type errors, and all tests PASS. The one app-core test that builds a parse result by hand casts it, so the new field needs no change there.

- [ ] **Step 8: Commit**

```bash
git add packages/vega-runtime/src/lib/spec-processing
git commit -m "feat(vega-runtime): record bound signals on the parse result (#346)"
```

### Task 4: Vega's rules for each control

A spec must behave the same in Deneb as in the Vega editor. These functions reproduce the rules in Vega's own `bind.js` (in the `vega-view` package): the label, the range defaults, how options match and are labelled, and what a generic input receives. One rule differs on purpose: Vega copies every `bind` property onto a generic input as an attribute, and Deneb passes an allowlist.

`tickStep` comes from `d3-array`, which Vega already depends on, so it adds nothing to the bundle.

**Files:**

- Modify: `packages/vega-runtime/package.json`
- Create: `packages/vega-runtime/src/lib/spec-processing/binding-controls.ts`
- Modify: `packages/vega-runtime/src/lib/spec-processing/index.ts`
- Test: `packages/vega-runtime/src/lib/spec-processing/__tests__/binding-controls.test.ts`

- [ ] **Step 1: Add the dependency**

In `packages/vega-runtime/package.json`, add to `dependencies` (keep the list alphabetical, before `d3-interpolate`):

```json
        "d3-array": "^3.2.4",
```

Add to `devDependencies` (alphabetical, after `@deneb-viz/typescript-config`):

```json
        "@types/d3-array": "^3.2.2",
```

Then run:

```bash
npm install
```

Expected: the lockfile gains the two entries under `packages/vega-runtime`. No package is downloaded, because both are already installed for Vega.

- [ ] **Step 2: Write the failing test**

Create `packages/vega-runtime/src/lib/spec-processing/__tests__/binding-controls.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { tickStep } from 'd3-array';

import {
    getBindingControlKind,
    getBindingLabel,
    getInputProperties,
    getInputType,
    getInputValue,
    getOptionLabel,
    getRangeAttributes,
    getSelectedOptionIndex
} from '../binding-controls';
import type { BoundSignal } from '../bound-signals';

describe('getBindingControlKind', () => {
    it.each(['range', 'checkbox', 'radio', 'select', 'color'])(
        'recognises %s',
        (input) => {
            expect(getBindingControlKind({ input })).toBe(input);
        }
    );

    it.each(['text', 'number', 'date', 'anything-else'])(
        'treats %s as a generic input',
        (input) => {
            expect(getBindingControlKind({ input })).toBe('input');
        }
    );
});

describe('getBindingLabel', () => {
    const boundSignal = (name?: string): BoundSignal => ({
        name: 'opacityVal',
        bind: { input: 'range', ...(name !== undefined && { name }) },
        key: 'key'
    });

    it('uses the binding name when there is one', () => {
        expect(getBindingLabel(boundSignal('Opacity'))).toBe('Opacity');
    });

    it('falls back to the signal name', () => {
        expect(getBindingLabel(boundSignal())).toBe('opacityVal');
        expect(getBindingLabel(boundSignal(''))).toBe('opacityVal');
    });
});

describe('getRangeAttributes', () => {
    it('uses the binding min, max and step when given', () => {
        expect(
            getRangeAttributes(
                { input: 'range', min: 0, max: 1, step: 0.1 },
                0.5
            )
        ).toEqual({ min: 0, max: 1, step: 0.1, value: 0.5 });
    });

    it('defaults to zero to one hundred in steps of one', () => {
        expect(getRangeAttributes({ input: 'range' }, 50)).toEqual({
            min: 0,
            max: 100,
            step: 1,
            value: 50
        });
    });

    it('widens the default max to hold a larger value', () => {
        expect(getRangeAttributes({ input: 'range' }, 250)).toEqual({
            min: 0,
            max: 250,
            step: tickStep(0, 250, 100),
            value: 250
        });
    });

    it('lowers the default min to hold a negative value', () => {
        expect(getRangeAttributes({ input: 'range' }, -20).min).toBe(-20);
    });

    it('shows the midpoint when the signal has no value', () => {
        expect(
            getRangeAttributes({ input: 'range', min: 0, max: 10 }, undefined)
                .value
        ).toBe(5);
        expect(getRangeAttributes({ input: 'range' }, undefined).value).toBe(
            50
        );
    });

    it('reads a null value as zero', () => {
        expect(getRangeAttributes({ input: 'range' }, null).value).toBe(0);
    });

    it('derives the step from the range when none is given', () => {
        expect(
            getRangeAttributes({ input: 'range', min: 0, max: 1 }, 0.5).step
        ).toBe(0.01);
    });
});

describe('getSelectedOptionIndex', () => {
    const bind = { input: 'select', options: [null, 'Europe', 3] };

    it('finds an identical option', () => {
        expect(getSelectedOptionIndex(bind, 'Europe')).toBe(1);
        expect(getSelectedOptionIndex(bind, null)).toBe(0);
    });

    it('finds an option whose string form matches', () => {
        expect(getSelectedOptionIndex(bind, '3')).toBe(2);
    });

    it('returns -1 when nothing matches or there are no options', () => {
        expect(getSelectedOptionIndex(bind, 'Japan')).toBe(-1);
        expect(getSelectedOptionIndex({ input: 'select' }, 'Japan')).toBe(-1);
    });
});

describe('getOptionLabel', () => {
    it('uses the label at the same position', () => {
        expect(
            getOptionLabel(
                { input: 'select', options: [null, 'a'], labels: ['All', 'A'] },
                0
            )
        ).toBe('All');
    });

    it('falls back to the option as text', () => {
        expect(getOptionLabel({ input: 'select', options: [null, 3] }, 1)).toBe(
            '3'
        );
        expect(getOptionLabel({ input: 'select', options: [null, 3] }, 0)).toBe(
            'null'
        );
    });
});

describe('getInputType', () => {
    it('keeps a type that the input control supports', () => {
        expect(getInputType({ input: 'number' })).toBe('number');
        expect(getInputType({ input: 'datetime-local' })).toBe(
            'datetime-local'
        );
    });

    it('falls back to text for any other type', () => {
        expect(getInputType({ input: 'file' })).toBe('text');
        expect(getInputType({ input: 'made-up' })).toBe('text');
    });
});

describe('getInputProperties', () => {
    it('passes the allowed attributes under their React property names', () => {
        expect(
            getInputProperties({
                input: 'text',
                placeholder: 'Search',
                autocomplete: 'off',
                maxlength: 10,
                minlength: 2,
                min: 0,
                max: 5,
                step: 1,
                pattern: '[a-z]+'
            })
        ).toEqual({
            placeholder: 'Search',
            autoComplete: 'off',
            maxLength: 10,
            minLength: 2,
            min: 0,
            max: 5,
            step: 1,
            pattern: '[a-z]+'
        });
    });

    it('drops everything else, including event handlers and style', () => {
        expect(
            getInputProperties({
                input: 'text',
                onclick: 'alert(1)',
                style: 'color: red',
                name: 'Label',
                debounce: 100
            })
        ).toEqual({});
    });

    it('drops an allowed attribute whose value is not text or a number', () => {
        expect(
            getInputProperties({ input: 'text', placeholder: { a: 1 } })
        ).toEqual({});
    });
});

describe('getInputValue', () => {
    it('shows an empty input for a missing value', () => {
        expect(getInputValue(undefined)).toBe('');
        expect(getInputValue(null)).toBe('');
    });

    it('shows any other value as text', () => {
        expect(getInputValue(3)).toBe('3');
        expect(getInputValue('abc')).toBe('abc');
    });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/spec-processing/__tests__/binding-controls.test.ts
```

Expected: FAIL. `../binding-controls` cannot be found.

- [ ] **Step 4: Write the implementation**

Create `packages/vega-runtime/src/lib/spec-processing/binding-controls.ts`:

```ts
import { tickStep } from 'd3-array';

import type { BoundSignal, BoundSignalBinding } from './bound-signals';

/**
 * The kinds of control Deneb renders. Vega has dedicated widgets for the
 * first four; `color` is a generic input that needs a native colour control;
 * everything else is a generic input.
 */
export type BindingControlKind =
    | 'range'
    | 'checkbox'
    | 'radio'
    | 'select'
    | 'color'
    | 'input';

export const getBindingControlKind = (
    bind: BoundSignalBinding
): BindingControlKind => {
    switch (bind.input) {
        case 'range':
        case 'checkbox':
        case 'radio':
        case 'select':
        case 'color':
            return bind.input;
        default:
            return 'input';
    }
};

/**
 * The text shown beside a control: the binding's `name`, or the signal name.
 */
export const getBindingLabel = (boundSignal: BoundSignal): string =>
    boundSignal.bind.name || boundSignal.name;

export type RangeAttributes = {
    min: number;
    max: number;
    step: number;
    value: number;
};

/**
 * Slider attributes, defaulted the way Vega's range widget defaults them.
 * With no signal value the slider shows the midpoint, as a browser does for
 * a range input that has no valid value.
 */
export const getRangeAttributes = (
    bind: BoundSignalBinding,
    signalValue: unknown
): RangeAttributes => {
    const requested =
        signalValue !== undefined
            ? Number(signalValue)
            : (Number(bind.max) + Number(bind.min)) / 2;
    const max =
        bind.max != null ? Number(bind.max) : Math.max(100, requested) || 100;
    const min = Number(bind.min) || Math.min(0, max, requested) || 0;
    const step = Number(bind.step) || tickStep(min, max, 100);
    const value = Number.isFinite(requested) ? requested : (min + max) / 2;
    return { min, max, step, value };
};

/**
 * Vega's own test for whether an option is the current value: identical, or
 * equal once both are converted to text.
 */
const isSameOptionValue = (option: unknown, value: unknown): boolean =>
    option === value || String(option) === String(value);

/**
 * The position of the option that matches the signal value, or -1.
 */
export const getSelectedOptionIndex = (
    bind: BoundSignalBinding,
    signalValue: unknown
): number =>
    (bind.options ?? []).findIndex((option) =>
        isSameOptionValue(option, signalValue)
    );

/**
 * The text for one option: its label, or the option itself as text.
 */
export const getOptionLabel = (
    bind: BoundSignalBinding,
    index: number
): string => String((bind.labels ?? [])[index] || (bind.options ?? [])[index]);

const SUPPORTED_INPUT_TYPES: readonly string[] = [
    'text',
    'email',
    'password',
    'search',
    'tel',
    'url',
    'date',
    'datetime-local',
    'month',
    'number',
    'time',
    'week'
];

/**
 * The `type` for a generic input. A type the input control cannot render
 * falls back to text.
 */
export const getInputType = (bind: BoundSignalBinding): string =>
    SUPPORTED_INPUT_TYPES.includes(bind.input) ? bind.input : 'text';

/**
 * The binding properties a generic input may receive, mapped to their React
 * property names. Vega copies every binding property onto the element; an
 * allowlist keeps event handlers, `style` and anything unexpected out.
 */
const INPUT_PROPERTY_NAMES: Record<string, string> = {
    placeholder: 'placeholder',
    autocomplete: 'autoComplete',
    min: 'min',
    max: 'max',
    step: 'step',
    minlength: 'minLength',
    maxlength: 'maxLength',
    pattern: 'pattern'
};

export const getInputProperties = (
    bind: BoundSignalBinding
): Record<string, string | number> => {
    const properties: Record<string, string | number> = {};
    for (const [attribute, property] of Object.entries(INPUT_PROPERTY_NAMES)) {
        const value = bind[attribute];
        if (typeof value === 'string' || typeof value === 'number') {
            properties[property] = value;
        }
    }
    return properties;
};

/**
 * The text a generic input shows for a signal value.
 */
export const getInputValue = (signalValue: unknown): string =>
    signalValue === undefined || signalValue === null
        ? ''
        : String(signalValue);
```

- [ ] **Step 5: Export it**

In `packages/vega-runtime/src/lib/spec-processing/index.ts`, add after the `patch-bindings` export:

```ts
export {
    getBindingControlKind,
    getBindingLabel,
    getInputProperties,
    getInputType,
    getInputValue,
    getOptionLabel,
    getRangeAttributes,
    getSelectedOptionIndex
} from './binding-controls';
export type { BindingControlKind, RangeAttributes } from './binding-controls';
```

- [ ] **Step 6: Run the package tests**

```bash
npm run test -w @deneb-viz/vega-runtime
```

Expected: PASS, with the coverage thresholds met.

- [ ] **Step 7: Commit**

```bash
git add package-lock.json packages/vega-runtime/package.json packages/vega-runtime/src/lib/spec-processing
git commit -m "feat(vega-runtime): add Vega's rules for binding controls (#346)"
```

### Task 5: Attach bound signals to a view

This is the runtime half of the binding, with no React in it. Given a view that has finished its first run, it does three things in order:

1. Applies any held value that differs from the view's. This covers input that arrived while the view was being rebuilt.
2. Records the view's current value for every bound signal.
3. Listens to every bound signal and records each change, whatever caused it.

It also writes control values to the view, after the binding's `debounce` when one is set.

**Files:**

- Create: `packages/vega-runtime/src/lib/view/bound-signal-session.ts`
- Modify: `packages/vega-runtime/src/lib/view/index.ts`
- Test: `packages/vega-runtime/src/lib/view/__tests__/bound-signal-session.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/vega-runtime/src/lib/view/__tests__/bound-signal-session.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, View, type Spec } from 'vega';

import {
    getBoundSignals,
    type BoundSignal,
    type HeldBoundValue,
    type HeldBoundValues
} from '../../spec-processing/bound-signals';
import { attachBoundSignals } from '../bound-signal-session';

const SPEC = {
    signals: [
        { name: 'a', value: 1, bind: { input: 'range' } },
        {
            name: 'b',
            value: 'x',
            bind: { input: 'select', options: ['x', 'y'] }
        },
        { name: 'c', update: 'a * 2', bind: { input: 'range' } },
        { name: 'd', value: 1, bind: { input: 'range', debounce: 50 } }
    ],
    marks: []
} as unknown as Spec;

const BOUND_SIGNALS = getBoundSignals(SPEC);
const [A, B, C, D] = BOUND_SIGNALS;

const createView = async () => {
    const view = new View(parse(SPEC), { renderer: 'none' });
    await view.runAsync();
    return view;
};

const attach = (
    view: View,
    heldValues: HeldBoundValues = {},
    boundSignals: BoundSignal[] = BOUND_SIGNALS
) => {
    const values: Record<string, HeldBoundValue> = {};
    const onValue = vi.fn((name: string, held: HeldBoundValue) => {
        values[name] = held;
    });
    const onError = vi.fn();
    const session = attachBoundSignals({
        view,
        boundSignals,
        heldValues,
        onValue,
        onError
    });
    return { session, values, onValue, onError };
};

describe('attachBoundSignals', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('records the current value of every bound signal when it attaches', async () => {
        const view = await createView();
        const { values } = attach(view);
        expect(values).toEqual({
            a: { key: A.key, value: 1 },
            b: { key: B.key, value: 'x' },
            c: { key: C.key, value: 2 },
            d: { key: D.key, value: 1 }
        });
    });

    it('applies a value that was held while no view was ready', async () => {
        const view = await createView();
        const { values } = attach(view, { a: { key: A.key, value: 7 } });
        expect(view.signal('a')).toBe(7);
        expect(values.a).toEqual({ key: A.key, value: 7 });
        await view.runAsync();
        expect(view.signal('c')).toBe(14);
        expect(values.c).toEqual({ key: C.key, value: 14 });
    });

    it('ignores a held value captured under another definition', async () => {
        const view = await createView();
        attach(view, { a: { key: 'stale', value: 7 } });
        expect(view.signal('a')).toBe(1);
    });

    it('does not write a held value to a signal with an update expression', async () => {
        const view = await createView();
        attach(view, { c: { key: C.key, value: 99 } });
        await view.runAsync();
        expect(view.signal('c')).toBe(2);
    });

    it('records a change made by something other than a control', async () => {
        const view = await createView();
        const { values } = attach(view);
        await view.signal('a', 5).runAsync();
        expect(values.a).toEqual({ key: A.key, value: 5 });
        expect(values.c).toEqual({ key: C.key, value: 10 });
    });

    it('writes a control value to the view', async () => {
        const view = await createView();
        const { session, values } = attach(view);
        session.write('b', 'y');
        await view.runAsync();
        expect(view.signal('b')).toBe('y');
        expect(values.b).toEqual({ key: B.key, value: 'y' });
    });

    it('delays a write by the binding debounce and applies only the last one', async () => {
        const view = await createView();
        const { session } = attach(view);
        vi.useFakeTimers();
        session.write('d', 3);
        session.write('d', 4);
        expect(view.signal('d')).toBe(1);
        vi.advanceTimersByTime(50);
        expect(view.signal('d')).toBe(4);
    });

    it('stops recording and writing once disposed', async () => {
        const view = await createView();
        const { session, onValue } = attach(view);
        onValue.mockClear();
        session.dispose();
        await view.signal('a', 9).runAsync();
        expect(onValue).not.toHaveBeenCalled();
        session.write('b', 'y');
        expect(view.signal('b')).toBe('x');
    });

    it('drops a debounced write that is still pending at disposal', async () => {
        const view = await createView();
        const { session } = attach(view);
        vi.useFakeTimers();
        session.write('d', 3);
        session.dispose();
        vi.advanceTimersByTime(50);
        expect(view.signal('d')).toBe(1);
    });

    it('skips a bound signal the view does not have', async () => {
        const view = await createView();
        const ghost: BoundSignal = {
            name: 'ghost',
            bind: { input: 'range' },
            key: 'ghost'
        };
        const { session, values } = attach(view, {}, [...BOUND_SIGNALS, ghost]);
        expect(values).not.toHaveProperty('ghost');
        expect(() => session.write('ghost', 1)).not.toThrow();
    });

    it('ignores a write for a name that is not bound', async () => {
        const view = await createView();
        const { session } = attach(view);
        expect(() => session.write('unbound', 1)).not.toThrow();
    });

    it('reports a run that fails after a write', async () => {
        const view = await createView();
        const { session, onError } = attach(view);
        vi.spyOn(view, 'runAsync').mockRejectedValueOnce(new Error('failed'));
        session.write('b', 'y');
        await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/view/__tests__/bound-signal-session.test.ts
```

Expected: FAIL. `../bound-signal-session` cannot be found.

- [ ] **Step 3: Write the implementation**

Create `packages/vega-runtime/src/lib/view/bound-signal-session.ts`:

```ts
import type { View } from 'vega';

import {
    getSeedValues,
    hasOwn,
    type BoundSignal,
    type HeldBoundValue,
    type HeldBoundValues
} from '../spec-processing/bound-signals';

export type BoundSignalSessionOptions = {
    /** A view that has completed its first run. */
    view: View;
    boundSignals: BoundSignal[];
    /** The held values at the moment of attaching. */
    heldValues: HeldBoundValues;
    /** Receives every value observed for a bound signal. */
    onValue: (name: string, held: HeldBoundValue) => void;
    /** Receives the error when a run started by a write fails. */
    onError?: (error: unknown) => void;
};

export type BoundSignalSession = {
    /** Write a control's value to the view, after the binding's debounce. */
    write: (name: string, value: unknown) => void;
    /** Stop listening and drop pending writes. The view is left alone. */
    dispose: () => void;
};

const isKnownSignal = (view: View, name: string): boolean => {
    try {
        view.signal(name);
        return true;
    } catch {
        return false;
    }
};

/**
 * Connect a set of bound signals to a view through the View API, which is
 * what Vega's own input binding is built on.
 *
 * On attaching, in this order:
 * 1. A held value that differs from the view's is written to the view. This
 *    applies input that arrived while no view was ready. Signals with an
 *    `update` expression are skipped, because the expression owns the value.
 * 2. The view's current value is reported for every bound signal.
 * 3. Every later change is reported, whatever causes it.
 */
export const attachBoundSignals = ({
    view,
    boundSignals,
    heldValues,
    onValue,
    onError
}: BoundSignalSessionOptions): BoundSignalSession => {
    const attached = boundSignals.filter((boundSignal) =>
        isKnownSignal(view, boundSignal.name)
    );
    let isDisposed = false;

    const run = () => {
        view.runAsync().catch((error: unknown) => onError?.(error));
    };

    const seedValues = getSeedValues(attached, heldValues);
    let hasAppliedHeldValue = false;
    for (const boundSignal of attached) {
        if (
            boundSignal.update !== undefined ||
            !hasOwn(seedValues, boundSignal.name)
        ) {
            continue;
        }
        const heldValue = seedValues[boundSignal.name];
        if (view.signal(boundSignal.name) !== heldValue) {
            view.signal(boundSignal.name, heldValue);
            hasAppliedHeldValue = true;
        }
    }
    if (hasAppliedHeldValue) {
        run();
    }

    for (const boundSignal of attached) {
        onValue(boundSignal.name, {
            key: boundSignal.key,
            value: view.signal(boundSignal.name)
        });
    }

    const listeners = attached.map((boundSignal) => {
        const listener = (_name: string, value: unknown) => {
            onValue(boundSignal.name, { key: boundSignal.key, value });
        };
        view.addSignalListener(boundSignal.name, listener);
        return { name: boundSignal.name, listener };
    });

    const debounceByName = new Map(
        attached.map((boundSignal) => [
            boundSignal.name,
            Number(boundSignal.bind.debounce) || 0
        ])
    );
    const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>();

    const writeNow = (name: string, value: unknown) => {
        if (isDisposed) {
            return;
        }
        view.signal(name, value);
        run();
    };

    return {
        write: (name, value) => {
            const delay = debounceByName.get(name);
            if (isDisposed || delay === undefined) {
                return;
            }
            if (delay <= 0) {
                writeNow(name, value);
                return;
            }
            clearTimeout(pendingWrites.get(name));
            pendingWrites.set(
                name,
                setTimeout(() => {
                    pendingWrites.delete(name);
                    writeNow(name, value);
                }, delay)
            );
        },
        dispose: () => {
            isDisposed = true;
            pendingWrites.forEach((timer) => clearTimeout(timer));
            pendingWrites.clear();
            listeners.forEach(({ name, listener }) =>
                view.removeSignalListener(name, listener)
            );
        }
    };
};
```

- [ ] **Step 4: Export it**

Replace the contents of `packages/vega-runtime/src/lib/view/index.ts` with:

```ts
export { VegaViewServices } from './service';
export { attachBoundSignals } from './bound-signal-session';
export type {
    BoundSignalSession,
    BoundSignalSessionOptions
} from './bound-signal-session';
export type * from './types';
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/view/__tests__/bound-signal-session.test.ts
```

Expected: PASS, 12 tests.

- [ ] **Step 6: Run the package tests and rebuild**

```bash
npm run test -w @deneb-viz/vega-runtime
npm run build -w @deneb-viz/vega-runtime
```

Expected: PASS, then a clean build.

- [ ] **Step 7: Commit**

```bash
git add packages/vega-runtime/src/lib/view
git commit -m "feat(vega-runtime): attach bound signals to a view through the View API (#346)"
```

### Task 6: Hold values in the store

Held values live in the store so that both viewer instances see the same ones and so the embed patch can read them without a React render. They last for the session and are not persisted.

**Files:**

- Create: `packages/app-core/src/state/bindings.ts`
- Modify: `packages/app-core/src/state/state.ts`
- Modify: `packages/app-core/src/state/index.ts`
- Test: `packages/app-core/src/state/__tests__/bindings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/app-core/src/state/__tests__/bindings.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createDenebState } from '../state';

describe('bindings slice', () => {
    it('starts with no held values and an expanded pane', () => {
        const { bindings } = createDenebState().getState();
        expect(bindings.heldValues).toEqual({});
        expect(bindings.isPaneCollapsed).toBe(false);
    });

    it('holds a value under its signal name', () => {
        const store = createDenebState();
        store.getState().bindings.setHeldValue('a', { key: 'k', value: 1 });
        store.getState().bindings.setHeldValue('b', { key: 'k', value: null });
        expect(store.getState().bindings.heldValues).toEqual({
            a: { key: 'k', value: 1 },
            b: { key: 'k', value: null }
        });
    });

    it('replaces a held value when the value or the definition key changes', () => {
        const store = createDenebState();
        store.getState().bindings.setHeldValue('a', { key: 'k', value: 1 });
        store.getState().bindings.setHeldValue('a', { key: 'k', value: 2 });
        expect(store.getState().bindings.heldValues.a).toEqual({
            key: 'k',
            value: 2
        });
        store.getState().bindings.setHeldValue('a', { key: 'other', value: 2 });
        expect(store.getState().bindings.heldValues.a.key).toBe('other');
    });

    it('keeps the same state object when an identical value is held again', () => {
        const store = createDenebState();
        store.getState().bindings.setHeldValue('a', { key: 'k', value: 1 });
        const before = store.getState().bindings;
        store.getState().bindings.setHeldValue('a', { key: 'k', value: 1 });
        expect(store.getState().bindings).toBe(before);
    });

    it('records whether the pane is collapsed', () => {
        const store = createDenebState();
        store.getState().bindings.setIsPaneCollapsed(true);
        expect(store.getState().bindings.isPaneCollapsed).toBe(true);
        store.getState().bindings.setIsPaneCollapsed(false);
        expect(store.getState().bindings.isPaneCollapsed).toBe(false);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm exec -w @deneb-viz/app-core -- vitest run src/state/__tests__/bindings.test.ts
```

Expected: FAIL. `bindings` is undefined on the state.

- [ ] **Step 3: Write the slice**

Create `packages/app-core/src/state/bindings.ts`:

```ts
import { type StateCreator } from 'zustand';
import type {
    HeldBoundValue,
    HeldBoundValues
} from '@deneb-viz/vega-runtime/spec-processing';

import { type CoreStoreState } from './state';

export type BindingsSliceProperties = {
    /**
     * The last-known value of each bound signal, by signal name. Each entry
     * is tagged with the definition it was captured under, and is ignored
     * once that definition changes. Lasts for the session; not persisted.
     */
    heldValues: HeldBoundValues;
    /**
     * Whether the reader has collapsed the bindings pane. Lasts for the
     * session; not persisted.
     */
    isPaneCollapsed: boolean;
    /**
     * Record the value of a bound signal. Holding a value identical to the
     * current one leaves the state untouched, so that a signal listener
     * echoing a control's own write causes no re-render.
     */
    setHeldValue: (name: string, held: HeldBoundValue) => void;
    setIsPaneCollapsed: (isPaneCollapsed: boolean) => void;
};

export type BindingsSlice = {
    bindings: BindingsSliceProperties;
};

export const createBindingsSlice =
    (): StateCreator<
        CoreStoreState,
        [['zustand/devtools', never]],
        [],
        BindingsSlice
    > =>
    (set) => ({
        bindings: {
            heldValues: {},
            isPaneCollapsed: false,
            setHeldValue: (name, held) =>
                set(
                    (state) => handleSetHeldValue(state, name, held),
                    false,
                    'bindings.setHeldValue'
                ),
            setIsPaneCollapsed: (isPaneCollapsed) =>
                set(
                    (state) => ({
                        bindings: { ...state.bindings, isPaneCollapsed }
                    }),
                    false,
                    'bindings.setIsPaneCollapsed'
                )
        }
    });

const handleSetHeldValue = (
    state: CoreStoreState,
    name: string,
    held: HeldBoundValue
): Partial<CoreStoreState> => {
    const isHeld = Object.prototype.hasOwnProperty.call(
        state.bindings.heldValues,
        name
    );
    const current = isHeld ? state.bindings.heldValues[name] : undefined;
    if (
        current !== undefined &&
        current.key === held.key &&
        Object.is(current.value, held.value)
    ) {
        return state;
    }
    return {
        bindings: {
            ...state.bindings,
            heldValues: { ...state.bindings.heldValues, [name]: held }
        }
    };
};
```

- [ ] **Step 4: Install the slice**

In `packages/app-core/src/state/state.ts`, add this import above the `./compilation` import:

```ts
import { createBindingsSlice, type BindingsSlice } from './bindings';
```

Change the start of `CoreStoreState` from:

```ts
export type CoreStoreState = CompilationSlice &
```

to:

```ts
export type CoreStoreState = BindingsSlice &
    CompilationSlice &
```

In `createDenebState`, add the new slice as the first entry of the object:

```ts
                ({
                    ...createBindingsSlice()(...a),
                    ...createCompilationSlice()(...a),
```

In `packages/app-core/src/state/index.ts`, add after the `export type * from './state';` line:

```ts
export type { BindingsSliceProperties } from './bindings';
```

- [ ] **Step 5: Run the tests**

```bash
npm exec -w @deneb-viz/app-core -- vitest run src/state/__tests__/bindings.test.ts
npm run typecheck -w @deneb-viz/app-core
```

Expected: PASS, 5 tests, and no type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/app-core/src/state
git commit -m "feat(app-core): hold bound signal values in the store (#346)"
```

### Task 7: Pass the patch to vega-embed

`useVegaEmbed` re-embeds when its options change, comparing them deeply and comparing functions by identity. A `patch` function created inside the component would have a new identity on every render and re-embed continuously. The function is therefore declared once in its own module and reads the store when vega-embed calls it.

**Files:**

- Create: `packages/app-core/src/features/visual-viewer/bindings-embed-patch.ts`
- Modify: `packages/app-core/src/features/visual-viewer/components/vega-embed.tsx`
- Test: `packages/app-core/src/features/visual-viewer/__tests__/bindings-embed-patch.test.ts`
- Test: `packages/app-core/src/features/visual-viewer/__tests__/bindings-pane-wiring.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/app-core/src/features/visual-viewer/__tests__/bindings-embed-patch.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Spec } from 'vega';

import { getDenebState } from '../../../state';
import { patchCompiledSpecForBindings } from '../bindings-embed-patch';

const SOURCE = {
    $schema: 'https://vega.github.io/schema/vega/v6.json',
    signals: [{ name: 'slider', value: 5, bind: { input: 'range' } }],
    marks: []
};

type LooseSpec = {
    config: { events: { bind: string } };
    signals: { name: string; value: unknown }[];
};

const patch = () =>
    patchCompiledSpecForBindings(
        SOURCE as unknown as Spec
    ) as unknown as LooseSpec;

// The tests share the store singleton and run in order.
describe('patchCompiledSpecForBindings', () => {
    it('switches input bindings off when nothing is compiled or held', () => {
        const patched = patch();
        expect(patched.config.events.bind).toBe('none');
        expect(patched.signals[0].value).toBe(5);
    });

    it('seeds a bound signal with the value held in the store', () => {
        getDenebState().compilation.compile({
            spec: JSON.stringify(SOURCE),
            config: '{}',
            provider: 'vega',
            containerDimensions: { width: 400, height: 300 }
        });
        const boundSignals =
            getDenebState().compilation.result?.parsed.boundSignals ?? [];
        expect(boundSignals.map((signal) => signal.name)).toEqual(['slider']);
        getDenebState().bindings.setHeldValue('slider', {
            key: boundSignals[0].key,
            value: 9
        });
        expect(patch().signals[0].value).toBe(9);
    });

    it('ignores a held value captured under another definition', () => {
        getDenebState().bindings.setHeldValue('slider', {
            key: 'stale',
            value: 3
        });
        expect(patch().signals[0].value).toBe(5);
    });
});
```

Create `packages/app-core/src/features/visual-viewer/__tests__/bindings-pane-wiring.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Structural canary for the bindings pane. Component render tests are not
 * run in this workspace, so the logic is tested in the functions the
 * components call, and this locks how they are wired together.
 */
const read = (...segments: string[]) =>
    readFileSync(resolve(__dirname, '..', ...segments), 'utf8');

describe('bindings pane wiring', () => {
    describe('embed patch', () => {
        const embedSource = read('components', 'vega-embed.tsx');

        it('passes the module-level patch function to vega-embed', () => {
            expect(embedSource).toMatch(
                /import \{ patchCompiledSpecForBindings \} from '\.\.\/bindings-embed-patch';/
            );
            expect(embedSource).toMatch(
                /patch: patchCompiledSpecForBindings\b/
            );
        });

        it('does not build a patch function in the component, where its identity would change on every render', () => {
            expect(embedSource).not.toMatch(/patch: \(/);
            expect(embedSource).not.toMatch(/patch: use/);
        });
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm exec -w @deneb-viz/app-core -- vitest run src/features/visual-viewer/__tests__/bindings-embed-patch.test.ts src/features/visual-viewer/__tests__/bindings-pane-wiring.test.ts
```

Expected: FAIL. `../bindings-embed-patch` cannot be found, and the import is missing from `vega-embed.tsx`.

- [ ] **Step 3: Write the patch module**

Create `packages/app-core/src/features/visual-viewer/bindings-embed-patch.ts`:

```ts
import type { Spec } from 'vega';
import {
    getSeedValues,
    patchSpecForBindings
} from '@deneb-viz/vega-runtime/spec-processing';

import { getDenebState } from '../../state';

/**
 * The `patch` option Deneb passes to vega-embed. vega-embed calls it with
 * the compiled Vega spec, for Vega and Vega-Lite alike, before parsing it.
 *
 * It switches Vega's own binding form off and seeds each bound signal with
 * its held value, so a rebuilt view starts where the last one left off.
 *
 * This is a module-level constant that reads the store when called. Its
 * identity never changes, which matters because `useVegaEmbed` re-embeds
 * whenever an option's identity does.
 */
export const patchCompiledSpecForBindings = (spec: Spec): Spec => {
    const { bindings, compilation } = getDenebState();
    const boundSignals = compilation.result?.parsed.boundSignals ?? [];
    return patchSpecForBindings(
        spec,
        getSeedValues(boundSignals, bindings.heldValues)
    );
};
```

- [ ] **Step 4: Pass it in the embed options**

In `packages/app-core/src/features/visual-viewer/components/vega-embed.tsx`, add this import after the `shouldOpenEmbedWindow` import:

```ts
import { patchCompiledSpecForBindings } from '../bindings-embed-patch';
```

In the `options` memo, replace:

```ts
            loader: vegaLoader ?? getRestrictiveVegaLoader()
        };
    }, [compilation]);
```

with:

```ts
            loader: vegaLoader ?? getRestrictiveVegaLoader(),
            // Switches Vega's binding form off and seeds held values. This
            // must stay a module-level constant: options are compared by
            // identity for functions, so a function created here would
            // re-embed on every render.
            patch: patchCompiledSpecForBindings
        };
    }, [compilation]);
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm exec -w @deneb-viz/app-core -- vitest run src/features/visual-viewer/__tests__
```

Expected: PASS for every file in the folder, including the existing `container-signal-owner-wiring.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add packages/app-core/src/features/visual-viewer
git commit -m "feat(app-core): switch Vega's binding form off and seed held values at embed (#346)"
```

At this point Vega no longer renders its form and nothing replaces it yet. The next two tasks add the pane; do not open a pull request between them.

### Task 8: The pane, its controls and the session hook

Three thin React files. Their logic is already tested: the control rules in Task 4, the view wiring in Task 5, the store in Task 6. This task adds the canary assertions for the hook first, then the files.

**Files:**

- Modify: `packages/app-core/src/i18n/en-US.json`
- Create: `packages/app-core/src/features/visual-viewer/components/bindings-pane/use-bound-signal-session.ts`
- Create: `packages/app-core/src/features/visual-viewer/components/bindings-pane/binding-control.tsx`
- Create: `packages/app-core/src/features/visual-viewer/components/bindings-pane/bindings-pane.tsx`
- Test: `packages/app-core/src/features/visual-viewer/__tests__/bindings-pane-wiring.test.ts`

- [ ] **Step 1: Add the failing canary assertions**

In `bindings-pane-wiring.test.ts`, add this block inside `describe('bindings pane wiring', ...)`, after the `embed patch` block:

```ts
describe('session hook', () => {
    const hookSource = read(
        'components',
        'bindings-pane',
        'use-bound-signal-session.ts'
    );

    it('attaches to the view of its own viewer instance, and only when that instance is live', () => {
        expect(hookSource).toMatch(/useVegaView\(\)/);
        expect(hookSource).toMatch(/if \(!isActive \|\| view === null/);
        expect(hookSource).toMatch(/attachBoundSignals\(\{/);
    });

    it('releases its listeners when the view or the bound signals change', () => {
        expect(hookSource).toMatch(/session\.dispose\(\)/);
        expect(hookSource).toMatch(/\}, \[isActive, view, boundSignals\]\);/);
    });

    it('holds a new value before writing it, and writes only to a ready view', () => {
        expect(hookSource).toMatch(
            /setHeldValue\([\s\S]*?\);\s*if \(state\.compilation\.viewReady\)/
        );
    });
});

describe('pane', () => {
    const paneSource = read('components', 'bindings-pane', 'bindings-pane.tsx');

    it('shows each control the held value for its signal', () => {
        expect(paneSource).toMatch(/getHeldValue\(boundSignal, heldValues\)/);
    });

    it('keeps the session running while collapsed, by calling the hook before any early return', () => {
        const hookCall = paneSource.indexOf('useBoundSignalSession(');
        const firstReturn = paneSource.indexOf('return (');
        expect(hookCall).toBeGreaterThan(-1);
        expect(hookCall).toBeLessThan(firstReturn);
    });
});
```

Run:

```bash
npm exec -w @deneb-viz/app-core -- vitest run src/features/visual-viewer/__tests__/bindings-pane-wiring.test.ts
```

Expected: FAIL. The two files under `bindings-pane` do not exist.

- [ ] **Step 2: Add the strings**

In `packages/app-core/src/i18n/en-US.json`, replace the last entry:

```json
    "Text_Settings_CollapseAll": "Collapse all categories"
}
```

with:

```json
    "Text_Settings_CollapseAll": "Collapse all categories",
    "Text_Bindings_Pane": "Controls",
    "Button_Bindings_Hide": "Hide controls",
    "Button_Bindings_Show": "Show controls"
}
```

- [ ] **Step 3: Write the session hook**

Create `packages/app-core/src/features/visual-viewer/components/bindings-pane/use-bound-signal-session.ts`:

```ts
import { useCallback, useEffect, useRef } from 'react';
import { useVegaView } from '@deneb-viz/vega-react';
import type { BoundSignal } from '@deneb-viz/vega-runtime/spec-processing';
import {
    attachBoundSignals,
    type BoundSignalSession
} from '@deneb-viz/vega-runtime/view';
import { logDebug } from '@deneb-viz/utils/logging';

import { getDenebState } from '../../../../state';

/**
 * Connects the bound signals to the Vega view of this viewer instance, and
 * returns the function a control calls with a new value.
 *
 * Two viewer instances can be mounted at once, and each has its own view
 * context. Only the live instance attaches.
 *
 * A new value is held in the store before it is written to the view. If no
 * view is ready, the write is skipped and the held value is applied when the
 * next view attaches.
 */
export const useBoundSignalSession = (
    boundSignals: BoundSignal[],
    isActive: boolean
) => {
    const { view } = useVegaView();
    const sessionRef = useRef<BoundSignalSession | null>(null);

    useEffect(() => {
        if (!isActive || view === null || boundSignals.length === 0) {
            return undefined;
        }
        const { bindings } = getDenebState();
        const session = attachBoundSignals({
            view,
            boundSignals,
            heldValues: bindings.heldValues,
            onValue: bindings.setHeldValue,
            onError: (error) =>
                logDebug('Bound signal write: the view run failed', { error })
        });
        sessionRef.current = session;
        return () => {
            session.dispose();
            sessionRef.current = null;
        };
    }, [isActive, view, boundSignals]);

    return useCallback((boundSignal: BoundSignal, value: unknown) => {
        const state = getDenebState();
        state.bindings.setHeldValue(boundSignal.name, {
            key: boundSignal.key,
            value
        });
        if (state.compilation.viewReady) {
            sessionRef.current?.write(boundSignal.name, value);
        }
    }, []);
};
```

- [ ] **Step 4: Write the control**

Create `packages/app-core/src/features/visual-viewer/components/bindings-pane/binding-control.tsx`:

```tsx
import {
    Checkbox,
    Field,
    Input,
    makeStyles,
    Radio,
    RadioGroup,
    Select,
    Slider,
    tokens,
    type InputProps
} from '@fluentui/react-components';
import {
    getBindingControlKind,
    getBindingLabel,
    getInputProperties,
    getInputType,
    getInputValue,
    getOptionLabel,
    getRangeAttributes,
    getSelectedOptionIndex,
    type BoundSignal
} from '@deneb-viz/vega-runtime/spec-processing';

const useBindingControlStyles = makeStyles({
    range: {
        alignItems: 'center',
        columnGap: tokens.spacingHorizontalS,
        display: 'flex'
    },
    rangeValue: {
        fontVariantNumeric: 'tabular-nums',
        minWidth: '3ch'
    },
    color: {
        height: '24px',
        width: '40px'
    }
});

type BindingControlProps = {
    boundSignal: BoundSignal;
    /** The signal's current value. */
    value: unknown;
    onChange: (boundSignal: BoundSignal, value: unknown) => void;
};

/**
 * One control for one bound signal. Each kind writes the type of value that
 * Vega's own widget writes: a number for a range, a boolean for a checkbox,
 * the option itself for a radio group or select, and text for anything else.
 *
 * Select is used instead of Dropdown because it opens the browser's native
 * list, which is not clipped by the visual's frame and is not mis-scaled by
 * the editor's preview zoom.
 */
export const BindingControl = ({
    boundSignal,
    value,
    onChange
}: BindingControlProps) => {
    const classes = useBindingControlStyles();
    const { bind } = boundSignal;
    const label = getBindingLabel(boundSignal);
    const options = bind.options ?? [];
    const selectedIndex = getSelectedOptionIndex(bind, value);
    const selectedOption = selectedIndex < 0 ? '' : String(selectedIndex);

    switch (getBindingControlKind(bind)) {
        case 'range': {
            const range = getRangeAttributes(bind, value);
            return (
                <Field label={label} size='small'>
                    <div className={classes.range}>
                        <Slider
                            size='small'
                            min={range.min}
                            max={range.max}
                            step={range.step}
                            value={range.value}
                            onChange={(_event, data) =>
                                onChange(boundSignal, data.value)
                            }
                        />
                        <span className={classes.rangeValue}>
                            {range.value}
                        </span>
                    </div>
                </Field>
            );
        }
        case 'checkbox':
            return (
                <Checkbox
                    label={label}
                    checked={!!value}
                    onChange={(_event, data) =>
                        onChange(boundSignal, data.checked === true)
                    }
                />
            );
        case 'radio':
            return (
                <Field label={label} size='small'>
                    <RadioGroup
                        layout='horizontal'
                        value={selectedOption}
                        onChange={(_event, data) =>
                            onChange(boundSignal, options[Number(data.value)])
                        }
                    >
                        {options.map((_option, index) => (
                            <Radio
                                key={index}
                                value={String(index)}
                                label={getOptionLabel(bind, index)}
                            />
                        ))}
                    </RadioGroup>
                </Field>
            );
        case 'select':
            return (
                <Field label={label} size='small'>
                    <Select
                        size='small'
                        value={selectedOption}
                        onChange={(_event, data) =>
                            onChange(boundSignal, options[Number(data.value)])
                        }
                    >
                        {options.map((_option, index) => (
                            <option key={index} value={String(index)}>
                                {getOptionLabel(bind, index)}
                            </option>
                        ))}
                    </Select>
                </Field>
            );
        case 'color':
            return (
                <Field label={label} size='small'>
                    {(fieldProps) => (
                        <input
                            {...fieldProps}
                            type='color'
                            className={classes.color}
                            value={getInputValue(value)}
                            onChange={(event) =>
                                onChange(boundSignal, event.target.value)
                            }
                        />
                    )}
                </Field>
            );
        default:
            return (
                <Field label={label} size='small'>
                    <Input
                        {...getInputProperties(bind)}
                        size='small'
                        type={getInputType(bind) as InputProps['type']}
                        value={getInputValue(value)}
                        onChange={(_event, data) =>
                            onChange(boundSignal, data.value)
                        }
                    />
                </Field>
            );
    }
};
```

- [ ] **Step 5: Write the pane**

Create `packages/app-core/src/features/visual-viewer/components/bindings-pane/bindings-pane.tsx`:

```tsx
import {
    Button,
    FluentProvider,
    makeStyles,
    tokens
} from '@fluentui/react-components';
import {
    ChevronDown16Regular,
    ChevronUp16Regular
} from '@fluentui/react-icons';
import {
    getHeldValue,
    type BoundSignal
} from '@deneb-viz/vega-runtime/spec-processing';

import { getDenebTheme } from '../../../../lib/interface/theme';
import { useDenebState } from '../../../../state';
import { BindingControl } from './binding-control';
import { useBoundSignalSession } from './use-bound-signal-session';

/**
 * The pane always uses the light theme, so it looks the same in the editor
 * preview as it does in the report.
 */
const PANE_THEME = getDenebTheme('light');

const useBindingsPaneStyles = makeStyles({
    pane: {
        alignItems: 'flex-start',
        backgroundColor: 'transparent',
        borderTopColor: tokens.colorNeutralStroke2,
        borderTopStyle: 'solid',
        borderTopWidth: tokens.strokeWidthThin,
        boxSizing: 'border-box',
        columnGap: tokens.spacingHorizontalS,
        display: 'flex',
        flexBasis: 'auto',
        flexGrow: 0,
        flexShrink: 0,
        // The pane never takes more than this share of the visual; beyond
        // it, the pane scrolls and the chart keeps the rest.
        maxHeight: '40%',
        overflowY: 'auto',
        paddingBottom: tokens.spacingVerticalXS,
        paddingLeft: tokens.spacingHorizontalS,
        paddingRight: tokens.spacingHorizontalXS,
        paddingTop: tokens.spacingVerticalXS
    },
    controls: {
        columnGap: tokens.spacingHorizontalL,
        display: 'flex',
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        flexWrap: 'wrap',
        minWidth: 0,
        rowGap: tokens.spacingVerticalXS
    },
    collapsedToggle: {
        backgroundColor: 'transparent',
        bottom: tokens.spacingVerticalXS,
        position: 'absolute',
        right: tokens.spacingHorizontalXS,
        zIndex: 1
    }
});

type BindingsPaneProps = {
    boundSignals: BoundSignal[];
    /** Whether the viewer instance that owns this pane is the live one. */
    isActive: boolean;
};

/**
 * The controls for a spec's bound signals. It sits beside the scroll
 * container, never inside it, so the chart is sized to the space it leaves.
 * When collapsed it leaves the layout, and a single button overlays the
 * chart to bring it back.
 */
export const BindingsPane = ({ boundSignals, isActive }: BindingsPaneProps) => {
    const classes = useBindingsPaneStyles();
    const { heldValues, isPaneCollapsed, setIsPaneCollapsed, translate } =
        useDenebState((state) => ({
            heldValues: state.bindings.heldValues,
            isPaneCollapsed: state.bindings.isPaneCollapsed,
            setIsPaneCollapsed: state.bindings.setIsPaneCollapsed,
            translate: state.i18n.translate
        }));
    const writeBoundSignal = useBoundSignalSession(boundSignals, isActive);

    if (isPaneCollapsed) {
        return (
            <FluentProvider
                theme={PANE_THEME}
                className={classes.collapsedToggle}
            >
                <Button
                    appearance='subtle'
                    size='small'
                    icon={<ChevronUp16Regular />}
                    aria-expanded={false}
                    aria-label={translate('Button_Bindings_Show')}
                    onClick={() => setIsPaneCollapsed(false)}
                />
            </FluentProvider>
        );
    }

    return (
        <FluentProvider
            theme={PANE_THEME}
            className={classes.pane}
            role='group'
            aria-label={translate('Text_Bindings_Pane')}
        >
            <div className={classes.controls}>
                {boundSignals.map((boundSignal) => (
                    <BindingControl
                        key={boundSignal.name}
                        boundSignal={boundSignal}
                        value={getHeldValue(boundSignal, heldValues)}
                        onChange={writeBoundSignal}
                    />
                ))}
            </div>
            <Button
                appearance='subtle'
                size='small'
                icon={<ChevronDown16Regular />}
                aria-expanded
                aria-label={translate('Button_Bindings_Hide')}
                onClick={() => setIsPaneCollapsed(true)}
            />
        </FluentProvider>
    );
};
```

- [ ] **Step 6: Run the canary and the type check**

```bash
npx prettier --write packages/app-core/src/features/visual-viewer/components/bindings-pane
npm exec -w @deneb-viz/app-core -- vitest run src/features/visual-viewer/__tests__/bindings-pane-wiring.test.ts
npm run typecheck -w @deneb-viz/app-core
npm run eslint -w @deneb-viz/app-core
```

Expected: the canary PASSES, with no type or lint errors. The lint run includes the layer-boundary rules; these files import only from `state`, `lib` and other packages, which a feature is allowed to do.

If Prettier reflows the hook so that a canary pattern no longer matches, change the pattern to match the formatted code. Do not change the order of the two statements it pins.

- [ ] **Step 7: Commit**

```bash
git add packages/app-core/src/i18n/en-US.json packages/app-core/src/features/visual-viewer
git commit -m "feat(app-core): add the bindings pane and its controls (#346)"
```

### Task 9: Put the pane beside the scroll container

`denebContainer` is measured from the scroll container. The pane must be its sibling, never its descendant, so that an inline pane shrinks the measured box and the existing resize path rebuilds the view at the new size. `useContainerSignalOwner` is not changed.

The scroll container gains a parent element. When there is no pane that parent uses `display: contents`, so it generates no box and the layout is exactly what it is today.

**Files:**

- Modify: `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx`
- Test: `packages/app-core/src/features/visual-viewer/__tests__/bindings-pane-wiring.test.ts`

- [ ] **Step 1: Add the failing canary assertions**

In `bindings-pane-wiring.test.ts`, add this block inside `describe('bindings pane wiring', ...)`, after the `pane` block:

```ts
describe('viewer layout', () => {
    const viewerSource = read('components', 'visual-viewer.tsx');

    it('renders a pane only for the live instance, and only when there are bound signals', () => {
        expect(viewerSource).toMatch(
            /const hasBindingsPane = isActive && boundSignals\.length > 0;/
        );
    });

    it('renders the pane beside the scroll container, never inside it', () => {
        expect(viewerSource).toMatch(
            /\{scrollContainer\}\s*\{hasBindingsPane && \(\s*<BindingsPane/
        );
        const declared = viewerSource.indexOf('const scrollContainer =');
        const used = viewerSource.indexOf('{scrollContainer}');
        expect(declared).toBeGreaterThan(-1);
        expect(used).toBeGreaterThan(declared);
        expect(viewerSource.slice(declared, used)).not.toContain(
            'BindingsPane'
        );
    });

    it('generates no layout box when there is no pane', () => {
        expect(viewerSource).toMatch(
            /layoutWithoutPane: \{ display: 'contents' \}/
        );
    });
});
```

Run:

```bash
npm exec -w @deneb-viz/app-core -- vitest run src/features/visual-viewer/__tests__/bindings-pane-wiring.test.ts
```

Expected: FAIL in the three new tests.

- [ ] **Step 2: Add the imports and the empty-list constant**

In `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx`, replace:

```ts
import type { SchemaValidator } from '@deneb-viz/vega-runtime/spec-processing';
```

with:

```ts
import type {
    BoundSignal,
    SchemaValidator
} from '@deneb-viz/vega-runtime/spec-processing';
```

Add after the `VegaEmbedErrorBoundary` import:

```ts
import { BindingsPane } from './bindings-pane/bindings-pane';
```

Add after the `type ScrollPosition` line:

```ts
/**
 * Shared empty list, so that a store selector returns the same reference
 * whenever there is no compile result.
 */
const NO_BOUND_SIGNALS: BoundSignal[] = [];
```

- [ ] **Step 3: Add the layout styles**

In `useVisualViewerStyles`, replace:

```ts
    overflowVisible: { overflow: 'visible' }
});
```

with:

```ts
    overflowVisible: { overflow: 'visible' },
    /**
     * The element that holds the scroll container and the bindings pane.
     * Without a pane it generates no box, so the scroll container is laid
     * out exactly as if this element were not there.
     */
    layoutWithoutPane: { display: 'contents' },
    layoutWithPane: {
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '100%',
        minWidth: '100%',
        position: 'relative',
        width: '100%'
    },
    /**
     * Lets the scroll container give up height to the pane. The scroll
     * container is the element `denebContainer` is measured from, so the
     * chart is sized to the space the pane leaves.
     */
    containerBesidePane: {
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        height: 'auto',
        minHeight: 0
    }
});
```

- [ ] **Step 4: Select the bound signals**

In the `useDenebState` selector at the top of `VisualViewer`, replace:

```ts
        logDurableWarn: state.compilation.logDurableWarn,
        translate: state.i18n.translate
    }));
```

with:

```ts
        logDurableWarn: state.compilation.logDurableWarn,
        translate: state.i18n.translate,
        boundSignals:
            state.compilation.result?.parsed.boundSignals ?? NO_BOUND_SIGNALS
    }));
```

In the destructuring list directly above it, replace:

```ts
        logDurableWarn,
        translate
    } = useDenebState((state) => ({
```

with:

```ts
        logDurableWarn,
        translate,
        boundSignals
    } = useDenebState((state) => ({
```

- [ ] **Step 5: Render the pane beside the scroll container**

Replace the component's final `return` statement, which starts `return useScrollbars ? (` and ends with `);` before the closing `};`, with:

```tsx
// Only the live instance shows a pane. The retained, hidden instance has
// no view of its own to bind to.
const hasBindingsPane = isActive && boundSignals.length > 0;

const scrollContainer = useScrollbars ? (
    <OverlayScrollbarsComponent
        ref={osRef}
        className={mergeClasses(
            classes.container,
            hasBindingsPane && classes.containerBesidePane
        )}
        style={scrollbarStyleVars}
        options={SCROLLBAR_OPTIONS}
        events={scrollbarEvents}
        defer
    >
        {vegaComponent}
    </OverlayScrollbarsComponent>
) : (
    <div
        ref={setFallbackElement}
        className={mergeClasses(
            classes.container,
            classes.overflowVisible,
            hasBindingsPane && classes.containerBesidePane
        )}
    >
        {vegaComponent}
    </div>
);

return (
    <div
        className={
            hasBindingsPane ? classes.layoutWithPane : classes.layoutWithoutPane
        }
    >
        {scrollContainer}
        {hasBindingsPane && (
            <BindingsPane boundSignals={boundSignals} isActive={isActive} />
        )}
    </div>
);
```

- [ ] **Step 6: Run the tests**

```bash
npx prettier --write packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx
npm run typecheck -w @deneb-viz/app-core
npm run eslint -w @deneb-viz/app-core
npm run test -w @deneb-viz/app-core
```

Expected: all PASS. `container-signal-owner-wiring.test.ts` must pass without being edited. If Prettier reflows the JSX so that a new canary pattern no longer matches, adjust the pattern, not the structure.

- [ ] **Step 7: Check it in the dev visual**

```bash
npm run dev
```

Load a Vega-Lite spec with a bound parameter, for example:

```json
{
    "data": { "name": "dataset" },
    "params": [
        {
            "name": "opacityVal",
            "value": 0.5,
            "bind": {
                "input": "range",
                "min": 0,
                "max": 1,
                "step": 0.1,
                "name": "Opacity"
            }
        }
    ],
    "mark": { "type": "bar", "opacity": { "expr": "opacityVal" } },
    "encoding": {
        "x": { "field": "Category", "type": "nominal" },
        "y": { "field": "Value", "type": "quantitative" }
    }
}
```

Replace `Category` and `Value` with a column and a measure from the visual's dataset. Confirm all of these:

- A Fluent slider labelled "Opacity" shows under the chart, and Vega's own slider does not.
- Moving the slider changes the bar opacity.
- Resizing the visual keeps the slider's value.
- The chevron collapses the pane, the chart takes the full height, and the button in the bottom-right corner brings the pane back with the value intact.
- A spec with no bound parameter shows no pane and looks as it did before.

- [ ] **Step 8: Commit**

```bash
git add packages/app-core/src/features/visual-viewer
git commit -m "feat(app-core): lay the bindings pane out beside the scroll container (#346)"
```

### Task 10: Delete the old binding styles

Vega no longer renders `form.vega-bindings`, so the rules that styled it are dead.

**Files:**

- Modify: `apps/deneb/style/visual.less`
- Modify: `apps/viewer/style/visual.less`

- [ ] **Step 1: Delete the block from both files**

In each file, delete this block and the blank line after it. It sits directly above the `@din-base64` line.

```less
/* Vega widgets */
.vega-bindings {
    line-height: 24px;
}

.vega-bind-name {
    display: inline-block;
    width: 120px;
}

.vega-bind input[type='range'] {
    width: 120px;
}

.vega-bind select {
    max-width: 200px;
}
```

- [ ] **Step 2: Confirm nothing refers to the classes**

```bash
git grep -n "vega-bind" -- . ":!docs"
```

Expected: no output. `git grep` searches tracked files only, so build output and `node_modules` are not included.

- [ ] **Step 3: Check formatting and commit**

```bash
npm run prettier-check
git add apps/deneb/style/visual.less apps/viewer/style/visual.less
git commit -m "refactor: remove styles for Vega's binding form (#346)"
```

### Task 11: Documentation

**Files:**

- Modify: `docs/plans/2026-07-23-001-container-signal-consolidation-design.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Mark the earlier decision as superseded**

In `docs/plans/2026-07-23-001-container-signal-consolidation-design.md`, replace this bullet:

```markdown
- **Parameter bindings (future):** bindings render inside the embed root,
  inside the scroll container — they are scrollable content, exactly as in
  1.x. They count toward `scrollWidth/Height` and scroll with the view; the
  measured element stays the scroll container, with no drawable-area
  subtraction. Keeping this consistent with 1.x is deliberate.
```

with:

```markdown
- **Parameter bindings:** superseded by the
  [bindings pane](../brainstorms/2026-11-17-bindings-pane-requirements.md).
  Deneb now renders the controls in a pane beside the scroll container, so
  an inline pane reduces the measured box. The measured element is still the
  scroll container.
```

- [ ] **Step 2: Describe the pane in `CLAUDE.md`**

In `CLAUDE.md`, add this section directly above the `### Build System Architecture` heading:

```markdown
### Bindings Pane

Signals and Vega-Lite parameters with an input `bind` get controls that Deneb renders itself. Vega's own binding form is switched off.

- **Compile time:** `parseSpec` records the bound signals on `ParsedSpec.boundSignals`. `bind` is only legal on top-level signals, so this is a flat list; for Vega-Lite it comes from the compiled Vega.
- **Embed time:** `VegaEmbed` passes `patchCompiledSpecForBindings` as vega-embed's `patch` option. It sets `config.events.bind` to `'none'` and seeds each bound signal with its held value. It must stay a module-level constant: `useVegaEmbed` re-embeds when an option's identity changes.
- **Runtime:** `attachBoundSignals` (`@deneb-viz/vega-runtime/view`) connects the controls to the view through `view.signal()` and signal listeners. Held values live in the `bindings` slice, tagged with the definition they were captured under, so they survive every view rebuild and reset when the author changes the signal.
- **Layout:** the pane is a sibling of the measured scroll container, never a descendant. An inline pane therefore shrinks the box `denebContainer` is measured from.
- **Control rules:** `binding-controls.ts` reproduces Vega's `bind.js`. Check it when Vega is upgraded.
```

- [ ] **Step 3: Commit**

```bash
npx prettier --write CLAUDE.md
git add CLAUDE.md docs/plans/2026-07-23-001-container-signal-consolidation-design.md
git commit -m "docs: describe the bindings pane and supersede the earlier bindings note (#346)"
```

### Task 12: Validate and open the pull request

- [ ] **Step 1: Run the local CI mirror**

```bash
npm run ci:local
```

Expected: PASS.

- [ ] **Step 2: Measure the packaged visuals**

Build both packaged visuals on `main` and on this branch, and record the size of each `.pbiviz` the commands report:

```bash
npm run package
npm run package -w @deneb-viz/viewer
```

Expected: both stay under the 2MB limit. Deneb Runtime grows, because it gains Slider, Select, Radio and Checkbox. Put both before-and-after sizes in the pull request description.

- [ ] **Step 3: Run the Power BI Desktop checklist**

With the packaged visual in Power BI Desktop:

- A slider value survives resizing the visual.
- A value survives collapsing and expanding the pane.
- A Vega-Lite point selection bound to a dropdown filters the chart, and its "all" option clears the filter.
- A checkbox, a radio group, a text input and a colour input each drive their signal.
- A responsive spec fills the space above the pane with no scrollbar.
- A report with a dark page background shows the pane without a white band.
- Interacting with the pane does not clear or change a cross-filter. If it does, the pane's root needs to stop the click from reaching the host handler; add that and re-test before continuing.
- A spec with no bound signals looks exactly as it does on `main`.
- In the editor, the pane appears in the preview and follows the same rules.

- [ ] **Step 4: Open the pull request**

```bash
git push -u origin feat/346-bindings-pane
gh pr create --base main --title "feat: render input bindings in a Deneb-owned pane (#346)"
```

The description must cover:

- What changes for existing reports: the controls take the Fluent look and a collapse toggle, the chart gets the space left after the pane, and bound values now survive a resize.
- That specs which hand-subtracted room for the controls will show a spare band until the workaround is removed.
- The bundle sizes from Step 2.
- `Closes #346`.

---

# Part 2: the `deneb.bindings` settings

Start after Part 1 has merged.

```bash
git checkout main && git pull && git checkout -b feat/275-bindings-settings
```

The settings and their defaults:

| Property      | Type                                     | Default                                      |
| ------------- | ---------------------------------------- | -------------------------------------------- |
| `orient`      | `"top"`, `"bottom"`, `"left"`, `"right"` | `"bottom"`                                   |
| `float`       | boolean                                  | `false`                                      |
| `collapsible` | boolean                                  | `true`                                       |
| `collapsed`   | boolean                                  | `false`                                      |
| `fontFamily`  | string                                   | theme font                                   |
| `fontSize`    | number, in px                            | theme body size                              |
| `color`       | CSS colour                               | theme foreground                             |
| `accentColor` | CSS colour                               | theme brand colour                           |
| `background`  | CSS colour                               | `"transparent"` inline, `"#ffffff"` floating |
| `borderColor` | CSS colour                               | theme neutral stroke                         |

### Task 13: Read and validate `deneb.bindings`

An invalid value falls back to its default with a warning. An unrecognised key is ignored with a warning. Neither is an error. The `deneb` key is removed from the config that is passed on, because Vega-Lite's config schema rejects unknown keys.

Colours are checked with the platform's `CSS.supports` when it exists. In node, where the tests run, it does not, and any non-empty text is accepted. The check is a parameter so the tests can control it.

**Files:**

- Create: `packages/vega-runtime/src/lib/spec-processing/bindings-settings.ts`
- Test: `packages/vega-runtime/src/lib/spec-processing/__tests__/bindings-settings.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/vega-runtime/src/lib/spec-processing/__tests__/bindings-settings.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    DEFAULT_BINDINGS_SETTINGS,
    extractBindingsSettings
} from '../bindings-settings';

const acceptAnyColor = () => true;
const rejectAnyColor = () => false;

const withBindings = (bindings: unknown) => ({ deneb: { bindings } });

describe('extractBindingsSettings', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns the defaults and the same config when there is no deneb key', () => {
        const config = { background: 'transparent' };
        const result = extractBindingsSettings(config);
        expect(result.settings).toBe(DEFAULT_BINDINGS_SETTINGS);
        expect(result.config).toBe(config);
        expect(result.warnings).toEqual([]);
    });

    it('removes the deneb key from the config that is passed on', () => {
        const result = extractBindingsSettings({
            background: 'transparent',
            ...withBindings({})
        });
        expect(result.config).toEqual({ background: 'transparent' });
        expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
        expect(result.warnings).toEqual([]);
    });

    it('does not mutate the config it is given', () => {
        const config = { background: 'transparent', ...withBindings({}) };
        const before = structuredClone(config);
        extractBindingsSettings(config);
        expect(config).toEqual(before);
    });

    it('reads every setting', () => {
        const bindings = {
            orient: 'right',
            float: true,
            collapsible: false,
            collapsed: true,
            fontFamily: 'Segoe UI',
            fontSize: 12,
            color: '#252423',
            accentColor: '#0078d4',
            background: 'rgba(255, 255, 255, 0.85)',
            borderColor: 'transparent'
        };
        const result = extractBindingsSettings(
            withBindings(bindings),
            acceptAnyColor
        );
        expect(result.settings).toEqual(bindings);
        expect(result.warnings).toEqual([]);
    });

    it('keeps the default for each setting that is not given', () => {
        const result = extractBindingsSettings(withBindings({ orient: 'top' }));
        expect(result.settings).toEqual({
            ...DEFAULT_BINDINGS_SETTINGS,
            orient: 'top'
        });
    });

    it.each([
        ['orient', 'middle'],
        ['orient', 3],
        ['float', 'yes'],
        ['collapsible', 1],
        ['collapsed', null],
        ['fontFamily', ''],
        ['fontFamily', 12],
        ['fontSize', 0],
        ['fontSize', -1],
        ['fontSize', '12'],
        ['color', 5]
    ])('falls back to the default and warns when %s is %j', (key, value) => {
        const result = extractBindingsSettings(
            withBindings({ [key]: value }),
            acceptAnyColor
        );
        expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]).toContain(`deneb.bindings.${key}`);
    });

    it.each(['color', 'accentColor', 'background', 'borderColor'])(
        'rejects a value for %s that is not a colour',
        (key) => {
            const result = extractBindingsSettings(
                withBindings({ [key]: 'not-a-colour' }),
                rejectAnyColor
            );
            expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]).toContain(`deneb.bindings.${key}`);
        }
    );

    it('ignores a key it does not recognise and warns about it', () => {
        const result = extractBindingsSettings({
            deneb: { theme: 'dark', bindings: { orientation: 'left' } }
        });
        expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
        expect(result.warnings).toHaveLength(2);
        expect(result.warnings[0]).toContain('deneb.theme');
        expect(result.warnings[1]).toContain('deneb.bindings.orientation');
    });

    it('warns when deneb is not an object, and still removes it', () => {
        const result = extractBindingsSettings({ deneb: 'bindings' });
        expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
        expect(result.config).toEqual({});
        expect(result.warnings).toHaveLength(1);
    });

    it('warns when deneb.bindings is not an object', () => {
        const result = extractBindingsSettings(withBindings(['right']));
        expect(result.settings).toEqual(DEFAULT_BINDINGS_SETTINGS);
        expect(result.warnings).toHaveLength(1);
    });

    it('accepts any non-empty text as a colour where the platform cannot check it', () => {
        expect(
            extractBindingsSettings(withBindings({ color: 'unchecked' }))
                .settings.color
        ).toBe('unchecked');
        const blank = extractBindingsSettings(withBindings({ color: '  ' }));
        expect(blank.settings.color).toBeUndefined();
        expect(blank.warnings).toHaveLength(1);
    });

    it('uses the platform colour check when there is one', () => {
        vi.stubGlobal('CSS', {
            supports: (property: string, value: string) =>
                property === 'color' && value === 'red'
        });
        expect(
            extractBindingsSettings(withBindings({ color: 'red' })).settings
                .color
        ).toBe('red');
        expect(
            extractBindingsSettings(withBindings({ color: 'reddish' })).warnings
        ).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/spec-processing/__tests__/bindings-settings.test.ts
```

Expected: FAIL. `../bindings-settings` cannot be found.

- [ ] **Step 3: Write the implementation**

Create `packages/vega-runtime/src/lib/spec-processing/bindings-settings.ts`:

```ts
import { hasOwn, isRecord } from './object-guards';

export const BINDINGS_ORIENT_VALUES = [
    'top',
    'bottom',
    'left',
    'right'
] as const;

export type BindingsOrient = (typeof BINDINGS_ORIENT_VALUES)[number];

/**
 * How the bindings pane is placed and styled. The style properties are
 * absent when the author has not set them, and the pane then uses its theme.
 */
export type BindingsSettings = {
    /** The edge of the visual the pane sits on. */
    orient: BindingsOrient;
    /** Overlay the chart instead of taking space beside it. */
    float: boolean;
    /** Show the control that collapses and expands the pane. */
    collapsible: boolean;
    /** Start collapsed. Applies only when `collapsible` is true. */
    collapsed: boolean;
    fontFamily?: string;
    /** In pixels, as elsewhere in a Vega config. */
    fontSize?: number;
    color?: string;
    accentColor?: string;
    background?: string;
    borderColor?: string;
};

export const DEFAULT_BINDINGS_SETTINGS: BindingsSettings = Object.freeze({
    orient: 'bottom',
    float: false,
    collapsible: true,
    collapsed: false
});

export type BindingsSettingsResult = {
    settings: BindingsSettings;
    /**
     * The config without its `deneb` key. The same object that was passed in
     * when it had no such key.
     */
    config: Record<string, unknown>;
    warnings: string[];
};

export type ColorValidator = (value: string) => boolean;

/**
 * Whether a string is a CSS colour. Uses the platform's own check where
 * there is one. Without it, any non-empty text is accepted and an invalid
 * colour is simply not applied by the browser.
 */
const isCssColor: ColorValidator = (value) =>
    typeof CSS !== 'undefined' && typeof CSS.supports === 'function'
        ? CSS.supports('color', value)
        : value.trim().length > 0;

const BOOLEAN_KEYS = ['float', 'collapsible', 'collapsed'] as const;
const COLOR_KEYS = [
    'color',
    'accentColor',
    'background',
    'borderColor'
] as const;
const RECOGNISED_KEYS: readonly string[] = [
    'orient',
    'fontFamily',
    'fontSize',
    ...BOOLEAN_KEYS,
    ...COLOR_KEYS
];

const isOrient = (value: unknown): value is BindingsOrient =>
    BINDINGS_ORIENT_VALUES.includes(value as BindingsOrient);

/**
 * Lift Deneb's settings out of a parsed config.
 *
 * The settings live under the config's `deneb` key, which Vega and
 * Vega-Lite must never see: Vega-Lite's config schema rejects unknown keys.
 * The key is removed from the config that is returned.
 *
 * An invalid value falls back to its default, and an unrecognised key is
 * ignored. Each adds a warning. Neither is an error.
 */
export const extractBindingsSettings = (
    config: Record<string, unknown>,
    isValidColor: ColorValidator = isCssColor
): BindingsSettingsResult => {
    if (!hasOwn(config, 'deneb')) {
        return { settings: DEFAULT_BINDINGS_SETTINGS, config, warnings: [] };
    }
    const { deneb, ...configWithoutDeneb } = config;
    const settings: BindingsSettings = { ...DEFAULT_BINDINGS_SETTINGS };
    const warnings: string[] = [];
    const result = { settings, config: configWithoutDeneb, warnings };

    if (!isRecord(deneb)) {
        warnings.push('Config: "deneb" must be an object. It was ignored.');
        return result;
    }
    for (const key of Object.keys(deneb)) {
        if (key !== 'bindings') {
            warnings.push(
                `Config: "deneb.${key}" is not a recognised setting. It was ignored.`
            );
        }
    }
    const bindings = deneb.bindings;
    if (bindings === undefined) {
        return result;
    }
    if (!isRecord(bindings)) {
        warnings.push(
            'Config: "deneb.bindings" must be an object. It was ignored.'
        );
        return result;
    }
    for (const key of Object.keys(bindings)) {
        if (!RECOGNISED_KEYS.includes(key)) {
            warnings.push(
                `Config: "deneb.bindings.${key}" is not a recognised setting. It was ignored.`
            );
        }
    }
    const warnInvalid = (key: string, expected: string) => {
        warnings.push(
            `Config: "deneb.bindings.${key}" must be ${expected}. The default was used.`
        );
    };

    if (bindings.orient !== undefined) {
        if (isOrient(bindings.orient)) {
            settings.orient = bindings.orient;
        } else {
            warnInvalid('orient', 'one of "top", "bottom", "left" or "right"');
        }
    }
    for (const key of BOOLEAN_KEYS) {
        const value = bindings[key];
        if (value === undefined) {
            continue;
        }
        if (typeof value === 'boolean') {
            settings[key] = value;
        } else {
            warnInvalid(key, 'true or false');
        }
    }
    if (bindings.fontFamily !== undefined) {
        const value = bindings.fontFamily;
        if (typeof value === 'string' && value.trim().length > 0) {
            settings.fontFamily = value;
        } else {
            warnInvalid('fontFamily', 'a font name');
        }
    }
    if (bindings.fontSize !== undefined) {
        const value = bindings.fontSize;
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
            settings.fontSize = value;
        } else {
            warnInvalid('fontSize', 'a number greater than zero');
        }
    }
    for (const key of COLOR_KEYS) {
        const value = bindings[key];
        if (value === undefined) {
            continue;
        }
        if (typeof value === 'string' && isValidColor(value)) {
            settings[key] = value;
        } else {
            warnInvalid(key, 'a CSS colour');
        }
    }
    return result;
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/spec-processing/__tests__/bindings-settings.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/vega-runtime/src/lib/spec-processing/bindings-settings.ts packages/vega-runtime/src/lib/spec-processing/__tests__/bindings-settings.test.ts
git commit -m "feat(vega-runtime): read and validate the deneb.bindings config key (#275)"
```

### Task 14: Put the settings on the parse result

`parseSpec` is the only caller of `patchConfig`, so lifting the settings out there covers every path: the config used for schema validation, the config merged into the spec for the validation compile, and the config handed to vega-embed. Only the config document is read; a `deneb` key inside a spec's own inline `config` block is not.

**Files:**

- Modify: `packages/vega-runtime/src/lib/spec-processing/types.ts`
- Modify: `packages/vega-runtime/src/lib/spec-processing/parse.ts`
- Modify: `packages/vega-runtime/src/lib/spec-processing/index.ts`
- Test: `packages/vega-runtime/src/lib/spec-processing/__tests__/parse.test.ts`

- [ ] **Step 1: Write the failing test**

Append this block to the end of `packages/vega-runtime/src/lib/spec-processing/__tests__/parse.test.ts`:

```ts
describe('parseSpec bindings settings', () => {
    const spec = JSON.stringify({
        $schema: 'https://vega.github.io/schema/vega/v6.json',
        marks: []
    });
    const containerDimensions = { width: 400, height: 300 };
    const configWith = (bindings: object) =>
        JSON.stringify({ padding: 5, deneb: { bindings } });

    it('returns the default settings when the config has no deneb key', () => {
        const result = parseSpec({
            spec,
            provider: 'vega',
            containerDimensions
        });
        expect(result.bindingsSettings).toEqual({
            orient: 'bottom',
            float: false,
            collapsible: true,
            collapsed: false
        });
    });

    it('reads deneb.bindings and removes the deneb key from the config', () => {
        const result = parseSpec({
            spec,
            config: configWith({ orient: 'left', float: true }),
            provider: 'vega',
            containerDimensions
        });
        expect(result.status).toBe('valid');
        expect(result.bindingsSettings).toMatchObject({
            orient: 'left',
            float: true
        });
        expect(result.config).not.toHaveProperty('deneb');
        expect(result.config.padding).toBe(5);
    });

    it('adds a warning for an invalid setting and uses the default', () => {
        const result = parseSpec({
            spec,
            config: configWith({ orient: 'middle' }),
            provider: 'vega',
            containerDimensions
        });
        expect(result.status).toBe('valid');
        expect(result.bindingsSettings.orient).toBe('bottom');
        expect(
            result.warnings.some((warning) =>
                warning.includes('deneb.bindings.orient')
            )
        ).toBe(true);
    });

    it('does not let the deneb key reach schema validation', () => {
        const schemaValidator = vi.fn(() => ({ valid: true, warnings: [] }));
        parseSpec({
            spec,
            config: configWith({ orient: 'left' }),
            provider: 'vega',
            containerDimensions,
            schemaValidator
        });
        expect(schemaValidator).toHaveBeenCalledTimes(1);
        const validated = schemaValidator.mock.calls[0] as unknown as [
            { config: object }
        ];
        expect(validated[0].config).not.toHaveProperty('deneb');
    });

    it('accepts a Vega-Lite spec whose config carries the deneb key', () => {
        const result = parseSpec({
            spec: JSON.stringify({
                data: { values: [{ a: 1 }] },
                mark: 'point',
                encoding: { x: { field: 'a', type: 'quantitative' } }
            }),
            config: configWith({ orient: 'top' }),
            provider: 'vegaLite',
            containerDimensions
        });
        expect(result.status).toBe('valid');
        expect(result.bindingsSettings.orient).toBe('top');
    });

    it('returns the default settings when the spec fails to parse', () => {
        const result = parseSpec({
            spec: '{ not json',
            config: configWith({ orient: 'left' }),
            provider: 'vega',
            containerDimensions
        });
        expect(result.status).toBe('error');
        expect(result.bindingsSettings.orient).toBe('bottom');
    });

    it('keeps the settings that were read when validation fails', () => {
        const result = parseSpec({
            spec: JSON.stringify({
                signals: [
                    { name: 'twice', value: 1 },
                    { name: 'twice', value: 2 }
                ],
                marks: []
            }),
            config: configWith({ orient: 'left' }),
            provider: 'vega',
            containerDimensions
        });
        expect(result.status).toBe('error');
        expect(result.bindingsSettings.orient).toBe('left');
        expect(result.config).not.toHaveProperty('deneb');
    });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm exec -w @deneb-viz/vega-runtime -- vitest run src/lib/spec-processing/__tests__/parse.test.ts
```

Expected: FAIL in the new block. `result.bindingsSettings` is undefined.

- [ ] **Step 3: Add the field to `ParsedSpec`**

In `packages/vega-runtime/src/lib/spec-processing/types.ts`, add this import:

```ts
import type { BindingsSettings } from './bindings-settings';
```

In `ParsedSpec`, add after `boundSignals`:

```ts
/**
 * Placement and style of the bindings pane, read from the config
 * document's `deneb.bindings` key. The defaults when parsing fails
 * before the config is read.
 */
bindingsSettings: BindingsSettings;
```

Update the comment on the `config` member of `ParsedSpec` to:

```ts
/** The parsed config, without its `deneb` key (null if errors) */
```

- [ ] **Step 4: Read the settings in `parseSpec`**

In `packages/vega-runtime/src/lib/spec-processing/parse.ts`, add to the imports:

```ts
import {
    DEFAULT_BINDINGS_SETTINGS,
    extractBindingsSettings
} from './bindings-settings';
```

In both early error returns (the spec JSON error and the config JSON error), add after `boundSignals: []`:

```ts
            boundSignals: [],
            bindingsSettings: DEFAULT_BINDINGS_SETTINGS
```

Directly after the config JSON error block, and before the `// Step 3` comment, add:

```ts
// Deneb's own settings live under the config's `deneb` key. They are
// read here and the key is removed, so that neither schema validation
// nor Vega ever sees it.
const bindings = extractBindingsSettings(parsedConfig.result ?? {});
warnings.push(...bindings.warnings);
const config = bindings.config;
```

In the `specWithConfig` object, replace:

```ts
config: parsedConfig.result || {};
```

with:

```ts
config;
```

In the `catch` block's return, replace:

```ts
            config: parsedConfig.result,
            errors: [redactedMessage],
            warnings,
            patchedDimensions: NO_PATCHED_DIMENSIONS,
            boundSignals: []
```

with:

```ts
            config,
            errors: [redactedMessage],
            warnings,
            patchedDimensions: NO_PATCHED_DIMENSIONS,
            boundSignals: [],
            bindingsSettings: bindings.settings
```

In the final return, replace:

```ts
        config: parsedConfig.result,
        errors: [],
        warnings,
        patchedDimensions,
        boundSignals
```

with:

```ts
        config,
        errors: [],
        warnings,
        patchedDimensions,
        boundSignals,
        bindingsSettings: bindings.settings
```

- [ ] **Step 5: Export it**

In `packages/vega-runtime/src/lib/spec-processing/index.ts`, add after the `binding-controls` exports:

```ts
export {
    BINDINGS_ORIENT_VALUES,
    DEFAULT_BINDINGS_SETTINGS,
    extractBindingsSettings
} from './bindings-settings';
export type { BindingsOrient, BindingsSettings } from './bindings-settings';
```

- [ ] **Step 6: Run the package tests, rebuild, and confirm app-core is unaffected**

```bash
npm run test -w @deneb-viz/vega-runtime
npm run build -w @deneb-viz/vega-runtime
npm run typecheck -w @deneb-viz/app-core
npm run test -w @deneb-viz/app-core
```

Expected: the vega-runtime tests PASS with coverage met, app-core has no type errors, and its tests PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/vega-runtime/src/lib/spec-processing
git commit -m "feat(vega-runtime): put the bindings settings on the parse result (#275)"
```

### Task 15: Resolve the theme and the collapsed state

Two small pieces of logic that the pane needs, each as a plain function.

The reader's collapse choice is stored together with the `collapsed` setting it was made under. When the author changes that setting, the stored choice no longer matches and the setting wins again. This needs no effect and no reset step.

**Files:**

- Create: `packages/app-core/src/lib/interface/bindings-theme.ts`
- Create: `packages/app-core/src/features/visual-viewer/bindings-pane-state.ts`
- Modify: `packages/app-core/src/state/bindings.ts`
- Modify: `packages/app-core/src/state/index.ts`
- Test: `packages/app-core/src/lib/interface/__tests__/bindings-theme.test.ts`
- Test: `packages/app-core/src/features/visual-viewer/__tests__/bindings-pane-state.test.ts`
- Test: `packages/app-core/src/state/__tests__/bindings.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/app-core/src/lib/interface/__tests__/bindings-theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_BINDINGS_SETTINGS } from '@deneb-viz/vega-runtime/spec-processing';

import { getBindingsTheme } from '../bindings-theme';
import { getDenebTheme } from '../theme';

describe('getBindingsTheme', () => {
    const light = getDenebTheme('light');

    it('is the light theme when no style is set', () => {
        expect(getBindingsTheme(DEFAULT_BINDINGS_SETTINGS)).toEqual(light);
    });

    it('does not modify the shared light theme', () => {
        const fontFamilyBefore = light.fontFamilyBase;
        getBindingsTheme({ ...DEFAULT_BINDINGS_SETTINGS, fontFamily: 'Arial' });
        expect(getDenebTheme('light').fontFamilyBase).toBe(fontFamilyBefore);
    });

    it('applies the font family', () => {
        const theme = getBindingsTheme({
            ...DEFAULT_BINDINGS_SETTINGS,
            fontFamily: 'Arial'
        });
        expect(theme.fontFamilyBase).toBe('Arial');
    });

    it('applies the font size in pixels with a matching line height', () => {
        const theme = getBindingsTheme({
            ...DEFAULT_BINDINGS_SETTINGS,
            fontSize: 10
        });
        expect(theme.fontSizeBase300).toBe('10px');
        expect(theme.lineHeightBase300).toBe('14px');
    });

    it('applies the text colour to labels and values', () => {
        const theme = getBindingsTheme({
            ...DEFAULT_BINDINGS_SETTINGS,
            color: '#123456'
        });
        expect(theme.colorNeutralForeground1).toBe('#123456');
        expect(theme.colorNeutralForeground2).toBe('#123456');
        expect(theme.colorNeutralForeground3).toBe('#123456');
    });

    it('applies the accent colour to filled, checked and focused states', () => {
        const theme = getBindingsTheme({
            ...DEFAULT_BINDINGS_SETTINGS,
            accentColor: '#0078d4'
        });
        expect(theme.colorCompoundBrandBackground).toBe('#0078d4');
        expect(theme.colorCompoundBrandBackgroundHover).toBe('#0078d4');
        expect(theme.colorCompoundBrandForeground1).toBe('#0078d4');
        expect(theme.colorCompoundBrandStroke).toBe('#0078d4');
        expect(theme.colorStrokeFocus2).toBe('#0078d4');
        expect(theme.colorNeutralForeground1).toBe(
            light.colorNeutralForeground1
        );
    });
});
```

Create `packages/app-core/src/features/visual-viewer/__tests__/bindings-pane-state.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { resolveIsPaneCollapsed } from '../bindings-pane-state';

describe('resolveIsPaneCollapsed', () => {
    it('follows the collapsed setting until the reader chooses', () => {
        expect(
            resolveIsPaneCollapsed({ collapsible: true, collapsed: true }, null)
        ).toBe(true);
        expect(
            resolveIsPaneCollapsed(
                { collapsible: true, collapsed: false },
                null
            )
        ).toBe(false);
    });

    it('follows the reader choice made under the current setting', () => {
        expect(
            resolveIsPaneCollapsed(
                { collapsible: true, collapsed: false },
                { isCollapsed: true, forSetting: false }
            )
        ).toBe(true);
    });

    it('returns to the setting once the setting has changed', () => {
        expect(
            resolveIsPaneCollapsed(
                { collapsible: true, collapsed: true },
                { isCollapsed: false, forSetting: false }
            )
        ).toBe(true);
    });

    it('is never collapsed when the pane is not collapsible', () => {
        expect(
            resolveIsPaneCollapsed(
                { collapsible: false, collapsed: true },
                null
            )
        ).toBe(false);
        expect(
            resolveIsPaneCollapsed(
                { collapsible: false, collapsed: true },
                { isCollapsed: true, forSetting: true }
            )
        ).toBe(false);
    });
});
```

In `packages/app-core/src/state/__tests__/bindings.test.ts`, add this test at the end of the `describe` block:

```ts
it('starts with no collapse choice, and records one with the setting it was made under', () => {
    const store = createDenebState();
    expect(store.getState().bindings.paneCollapseChoice).toBeNull();
    store.getState().bindings.setPaneCollapseChoice({
        isCollapsed: true,
        forSetting: false
    });
    expect(store.getState().bindings.paneCollapseChoice).toEqual({
        isCollapsed: true,
        forSetting: false
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm exec -w @deneb-viz/app-core -- vitest run src/lib/interface/__tests__/bindings-theme.test.ts src/features/visual-viewer/__tests__/bindings-pane-state.test.ts src/state/__tests__/bindings.test.ts
```

Expected: FAIL. The two new modules cannot be found, and `paneCollapseChoice` is undefined.

- [ ] **Step 3: Add the collapse choice to the slice**

`isPaneCollapsed` stays for now, because the pane still reads it. The next task switches the pane over and removes it.

In `packages/app-core/src/state/bindings.ts`, add this type above `BindingsSliceProperties`:

```ts
/**
 * The reader's choice to collapse or expand the pane, together with the
 * `collapsed` setting that was in force when they made it. Once the author
 * changes that setting, the choice no longer applies.
 */
export type PaneCollapseChoice = {
    isCollapsed: boolean;
    forSetting: boolean;
};
```

In `BindingsSliceProperties`, add after the `isPaneCollapsed` member:

```ts
/**
 * The reader's collapse choice, or null until they use the toggle.
 * Lasts for the session; not persisted.
 */
paneCollapseChoice: PaneCollapseChoice | null;
```

and add after the `setIsPaneCollapsed` member:

```ts
    setPaneCollapseChoice: (choice: PaneCollapseChoice) => void;
```

In `createBindingsSlice`, add `paneCollapseChoice: null,` after `isPaneCollapsed: false,`. Then add a comma after the closing parenthesis of the `setIsPaneCollapsed` action, and add this action after it:

```ts
setPaneCollapseChoice: (paneCollapseChoice) =>
    set(
        (state) => ({
            bindings: { ...state.bindings, paneCollapseChoice }
        }),
        false,
        'bindings.setPaneCollapseChoice'
    );
```

In `packages/app-core/src/state/index.ts`, replace the `bindings` export line with:

```ts
export type { BindingsSliceProperties, PaneCollapseChoice } from './bindings';
```

- [ ] **Step 4: Write the two functions**

Create `packages/app-core/src/features/visual-viewer/bindings-pane-state.ts`:

```ts
import type { BindingsSettings } from '@deneb-viz/vega-runtime/spec-processing';

import type { PaneCollapseChoice } from '../../state';

/**
 * Whether the bindings pane is collapsed right now.
 *
 * The `collapsed` setting gives the starting state. The reader's choice
 * overrides it, but only while it was made under the setting that is still
 * in force: when the author changes the setting, the setting wins again. A
 * pane that is not collapsible is always expanded.
 */
export const resolveIsPaneCollapsed = (
    settings: Pick<BindingsSettings, 'collapsible' | 'collapsed'>,
    choice: PaneCollapseChoice | null
): boolean => {
    if (!settings.collapsible) {
        return false;
    }
    return choice !== null && choice.forSetting === settings.collapsed
        ? choice.isCollapsed
        : settings.collapsed;
};
```

Create `packages/app-core/src/lib/interface/bindings-theme.ts`:

```ts
import { type Theme } from '@fluentui/react-components';
import type { BindingsSettings } from '@deneb-viz/vega-runtime/spec-processing';

import { getDenebTheme } from './theme';

/** The tokens Fluent's form controls use for labels and values. */
const TEXT_TOKENS = [
    'colorNeutralForeground1',
    'colorNeutralForeground2',
    'colorNeutralForeground3'
] as const;

/**
 * The tokens Fluent uses for a slider's fill and thumb, a checked checkbox
 * or radio, and the focus indicator.
 */
const ACCENT_TOKENS = [
    'colorCompoundBrandBackground',
    'colorCompoundBrandBackgroundHover',
    'colorCompoundBrandBackgroundPressed',
    'colorCompoundBrandForeground1',
    'colorCompoundBrandForeground1Hover',
    'colorCompoundBrandForeground1Pressed',
    'colorCompoundBrandStroke',
    'colorCompoundBrandStrokeHover',
    'colorCompoundBrandStrokePressed',
    'colorStrokeFocus2'
] as const;

/** Fluent's own ratio of line height to font size for body text. */
const LINE_HEIGHT_RATIO = 1.4;

/**
 * The Fluent theme for the bindings pane: the light theme, with the author's
 * style settings applied over it. The pane does not follow the editor's
 * theme, so it looks the same in the preview as in the report.
 */
export const getBindingsTheme = (settings: BindingsSettings): Theme => {
    const theme: Theme = { ...getDenebTheme('light') };
    if (settings.fontFamily !== undefined) {
        theme.fontFamilyBase = settings.fontFamily;
    }
    if (settings.fontSize !== undefined) {
        theme.fontSizeBase300 = `${settings.fontSize}px`;
        theme.lineHeightBase300 = `${Math.ceil(
            settings.fontSize * LINE_HEIGHT_RATIO
        )}px`;
    }
    if (settings.color !== undefined) {
        for (const token of TEXT_TOKENS) {
            theme[token] = settings.color;
        }
    }
    if (settings.accentColor !== undefined) {
        for (const token of ACCENT_TOKENS) {
            theme[token] = settings.accentColor;
        }
    }
    return theme;
};
```

- [ ] **Step 5: Run the tests**

```bash
npm exec -w @deneb-viz/app-core -- vitest run src/lib/interface/__tests__/bindings-theme.test.ts src/features/visual-viewer/__tests__/bindings-pane-state.test.ts src/state/__tests__/bindings.test.ts
```

Then run the type check:

```bash
npm run typecheck -w @deneb-viz/app-core
```

Expected: the tests PASS, and there are no type errors.

- [ ] **Step 6: Commit**

```bash
git add packages/app-core/src
git commit -m "feat(app-core): resolve the bindings pane theme and collapsed state (#275)"
```

### Task 16: Make the pane follow the settings

> **Rewrite before use.** The pane code in this task predates changes made while Part 1 was built. See "Before starting Part 2" in the execution notes at the top of this plan.

**Files:**

- Modify: `packages/app-core/src/features/visual-viewer/components/bindings-pane/bindings-pane.tsx`
- Modify: `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx`
- Modify: `packages/app-core/src/state/bindings.ts`
- Test: `packages/app-core/src/features/visual-viewer/__tests__/bindings-pane-wiring.test.ts`
- Test: `packages/app-core/src/state/__tests__/bindings.test.ts`

- [ ] **Step 1: Add the failing canary assertions**

In `bindings-pane-wiring.test.ts`, add this block inside `describe('bindings pane wiring', ...)`, after the `viewer layout` block:

```ts
describe('settings', () => {
    const viewerSource = read('components', 'visual-viewer.tsx');
    const paneSource = read('components', 'bindings-pane', 'bindings-pane.tsx');

    it('passes the parsed settings from the compile result to the pane', () => {
        expect(viewerSource).toMatch(
            /state\.compilation\.result\?\.parsed\.bindingsSettings \?\?\s*DEFAULT_BINDINGS_SETTINGS/
        );
        expect(viewerSource).toMatch(/settings=\{bindingsSettings\}/);
    });

    it('takes no space from the scroll container when the pane floats', () => {
        expect(viewerSource).toMatch(
            /const hasInlinePane = hasBindingsPane && !bindingsSettings\.float;/
        );
    });

    it('resolves the collapsed state and the theme from the settings', () => {
        expect(paneSource).toMatch(/resolveIsPaneCollapsed\(/);
        expect(paneSource).toMatch(/getBindingsTheme\(settings\)/);
    });

    it('records the reader choice with the setting it was made under', () => {
        expect(paneSource).toMatch(/forSetting: settings\.collapsed/);
    });
});
```

Run:

```bash
npm exec -w @deneb-viz/app-core -- vitest run src/features/visual-viewer/__tests__/bindings-pane-wiring.test.ts
```

Expected: FAIL in the four new tests.

- [ ] **Step 2: Rewrite the pane**

Replace the contents of `packages/app-core/src/features/visual-viewer/components/bindings-pane/bindings-pane.tsx` with:

```tsx
import { useMemo, type CSSProperties, type ReactElement } from 'react';
import {
    Button,
    FluentProvider,
    makeStyles,
    mergeClasses,
    tokens
} from '@fluentui/react-components';
import {
    ChevronDown16Regular,
    ChevronLeft16Regular,
    ChevronRight16Regular,
    ChevronUp16Regular
} from '@fluentui/react-icons';
import {
    getHeldValue,
    type BindingsOrient,
    type BindingsSettings,
    type BoundSignal
} from '@deneb-viz/vega-runtime/spec-processing';

import { getBindingsTheme } from '../../../../lib/interface/bindings-theme';
import { useDenebState } from '../../../../state';
import { resolveIsPaneCollapsed } from '../../bindings-pane-state';
import { BindingControl } from './binding-control';
import { useBoundSignalSession } from './use-bound-signal-session';

/**
 * The colour of the line between the pane and the chart. Set on the pane's
 * root from the `borderColor` setting, and read by whichever edge faces the
 * chart.
 */
const BORDER_COLOR_PROPERTY = '--deneb-bindings-border-color';
const BORDER_COLOR = `var(${BORDER_COLOR_PROPERTY})`;

/** A pane never takes more than this share of the visual. */
const PANE_MAXIMUM_SHARE = '40%';

const useBindingsPaneStyles = makeStyles({
    pane: {
        boxSizing: 'border-box',
        columnGap: tokens.spacingHorizontalS,
        display: 'flex',
        flexBasis: 'auto',
        flexGrow: 0,
        flexShrink: 0,
        overflowY: 'auto',
        paddingBottom: tokens.spacingVerticalXS,
        paddingLeft: tokens.spacingHorizontalS,
        paddingRight: tokens.spacingHorizontalXS,
        paddingTop: tokens.spacingVerticalXS,
        rowGap: tokens.spacingVerticalXS
    },
    paneAlongWidth: {
        alignItems: 'flex-start',
        flexDirection: 'row',
        maxHeight: PANE_MAXIMUM_SHARE,
        width: '100%'
    },
    paneAlongHeight: {
        flexDirection: 'column',
        height: '100%',
        maxWidth: PANE_MAXIMUM_SHARE
    },
    borderForBottom: {
        borderTopColor: BORDER_COLOR,
        borderTopStyle: 'solid',
        borderTopWidth: tokens.strokeWidthThin
    },
    borderForTop: {
        borderBottomColor: BORDER_COLOR,
        borderBottomStyle: 'solid',
        borderBottomWidth: tokens.strokeWidthThin
    },
    borderForLeft: {
        borderRightColor: BORDER_COLOR,
        borderRightStyle: 'solid',
        borderRightWidth: tokens.strokeWidthThin
    },
    borderForRight: {
        borderLeftColor: BORDER_COLOR,
        borderLeftStyle: 'solid',
        borderLeftWidth: tokens.strokeWidthThin
    },
    float: { position: 'absolute', zIndex: 1 },
    floatAtBottom: { bottom: 0, left: 0 },
    floatAtTop: { left: 0, top: 0 },
    floatAtLeft: { left: 0, top: 0 },
    floatAtRight: { right: 0, top: 0 },
    controls: {
        columnGap: tokens.spacingHorizontalL,
        display: 'flex',
        minWidth: 0,
        rowGap: tokens.spacingVerticalXS
    },
    controlsAlongWidth: {
        flexBasis: 0,
        flexDirection: 'row',
        flexGrow: 1,
        flexShrink: 1,
        flexWrap: 'wrap'
    },
    controlsAlongHeight: { flexDirection: 'column' },
    toggleAlongHeight: { alignSelf: 'flex-end', order: -1 },
    collapsedToggle: { position: 'absolute', zIndex: 1 },
    collapsedAtBottom: {
        bottom: tokens.spacingVerticalXS,
        right: tokens.spacingHorizontalXS
    },
    collapsedAtTopRight: {
        right: tokens.spacingHorizontalXS,
        top: tokens.spacingVerticalXS
    },
    collapsedAtTopLeft: {
        left: tokens.spacingHorizontalXS,
        top: tokens.spacingVerticalXS
    }
});

/** The chevron that points the way the pane will move when it is hidden. */
const HIDE_ICONS: Record<BindingsOrient, ReactElement> = {
    bottom: <ChevronDown16Regular />,
    top: <ChevronUp16Regular />,
    left: <ChevronLeft16Regular />,
    right: <ChevronRight16Regular />
};

/** The chevron that points the way the pane will move when it is shown. */
const SHOW_ICONS: Record<BindingsOrient, ReactElement> = {
    bottom: <ChevronUp16Regular />,
    top: <ChevronDown16Regular />,
    left: <ChevronRight16Regular />,
    right: <ChevronLeft16Regular />
};

type BindingsPaneProps = {
    boundSignals: BoundSignal[];
    /** Whether the viewer instance that owns this pane is the live one. */
    isActive: boolean;
    settings: BindingsSettings;
};

/**
 * The controls for a spec's bound signals, placed and styled by the
 * `deneb.bindings` settings.
 *
 * Inline, it sits beside the scroll container, never inside it, so the chart
 * is sized to the space it leaves. Floating, it overlays the chart and takes
 * no space. Collapsed, it leaves the layout and a single button overlays the
 * chart, in the corner nearest its edge, to bring it back.
 */
export const BindingsPane = ({
    boundSignals,
    isActive,
    settings
}: BindingsPaneProps) => {
    const classes = useBindingsPaneStyles();
    const { heldValues, paneCollapseChoice, setPaneCollapseChoice, translate } =
        useDenebState((state) => ({
            heldValues: state.bindings.heldValues,
            paneCollapseChoice: state.bindings.paneCollapseChoice,
            setPaneCollapseChoice: state.bindings.setPaneCollapseChoice,
            translate: state.i18n.translate
        }));
    const writeBoundSignal = useBoundSignalSession(boundSignals, isActive);
    const theme = useMemo(() => getBindingsTheme(settings), [settings]);

    const { orient } = settings;
    const runsAlongWidth = orient === 'top' || orient === 'bottom';
    const isCollapsed = resolveIsPaneCollapsed(settings, paneCollapseChoice);
    const setIsCollapsed = (isCollapsedNow: boolean) =>
        setPaneCollapseChoice({
            isCollapsed: isCollapsedNow,
            forSetting: settings.collapsed
        });

    if (isCollapsed) {
        const collapsedCornerClasses: Record<BindingsOrient, string> = {
            bottom: classes.collapsedAtBottom,
            top: classes.collapsedAtTopRight,
            right: classes.collapsedAtTopRight,
            left: classes.collapsedAtTopLeft
        };
        return (
            <FluentProvider
                theme={theme}
                className={mergeClasses(
                    classes.collapsedToggle,
                    collapsedCornerClasses[orient]
                )}
                style={{ backgroundColor: 'transparent' }}
            >
                <Button
                    appearance='subtle'
                    size='small'
                    icon={SHOW_ICONS[orient]}
                    aria-expanded={false}
                    aria-label={translate('Button_Bindings_Show')}
                    onClick={() => setIsCollapsed(false)}
                />
            </FluentProvider>
        );
    }

    const borderClasses: Record<BindingsOrient, string> = {
        bottom: classes.borderForBottom,
        top: classes.borderForTop,
        left: classes.borderForLeft,
        right: classes.borderForRight
    };
    const floatClasses: Record<BindingsOrient, string> = {
        bottom: classes.floatAtBottom,
        top: classes.floatAtTop,
        left: classes.floatAtLeft,
        right: classes.floatAtRight
    };
    const paneStyle = {
        backgroundColor:
            settings.background ?? (settings.float ? '#ffffff' : 'transparent'),
        [BORDER_COLOR_PROPERTY]:
            settings.borderColor ?? tokens.colorNeutralStroke2
    } as CSSProperties;

    return (
        <FluentProvider
            theme={theme}
            className={mergeClasses(
                classes.pane,
                runsAlongWidth
                    ? classes.paneAlongWidth
                    : classes.paneAlongHeight,
                borderClasses[orient],
                settings.float && classes.float,
                settings.float && floatClasses[orient]
            )}
            style={paneStyle}
            role='group'
            aria-label={translate('Text_Bindings_Pane')}
        >
            <div
                className={mergeClasses(
                    classes.controls,
                    runsAlongWidth
                        ? classes.controlsAlongWidth
                        : classes.controlsAlongHeight
                )}
            >
                {boundSignals.map((boundSignal) => (
                    <BindingControl
                        key={boundSignal.name}
                        boundSignal={boundSignal}
                        value={getHeldValue(boundSignal, heldValues)}
                        onChange={writeBoundSignal}
                    />
                ))}
            </div>
            {settings.collapsible && (
                <Button
                    className={
                        runsAlongWidth ? undefined : classes.toggleAlongHeight
                    }
                    appearance='subtle'
                    size='small'
                    icon={HIDE_ICONS[orient]}
                    aria-expanded
                    aria-label={translate('Button_Bindings_Hide')}
                    onClick={() => setIsCollapsed(true)}
                />
            )}
        </FluentProvider>
    );
};
```

- [ ] **Step 3: Lay the viewer out for each orient**

In `packages/app-core/src/features/visual-viewer/components/visual-viewer.tsx`, replace the spec-processing type import with:

```ts
import {
    DEFAULT_BINDINGS_SETTINGS,
    type BindingsOrient,
    type BoundSignal,
    type SchemaValidator
} from '@deneb-viz/vega-runtime/spec-processing';
```

In `useVisualViewerStyles`, replace the `layoutWithPane` and `containerBesidePane` slots and their comments with:

```ts
    layoutWithPane: {
        boxSizing: 'border-box',
        display: 'flex',
        height: '100%',
        minHeight: '100%',
        minWidth: '100%',
        position: 'relative',
        width: '100%'
    },
    // The pane is the second child, so the direction decides which edge it
    // sits on.
    layoutPaneAtBottom: { flexDirection: 'column' },
    layoutPaneAtTop: { flexDirection: 'column-reverse' },
    layoutPaneAtRight: { flexDirection: 'row' },
    layoutPaneAtLeft: { flexDirection: 'row-reverse' },
    /**
     * Let the scroll container give up space to an inline pane: height for a
     * pane on the top or bottom, width for one on the left or right. The
     * scroll container is the element `denebContainer` is measured from, so
     * the chart is sized to the space the pane leaves.
     */
    containerAbovePane: {
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        height: 'auto',
        minHeight: 0
    },
    containerBesidePane: {
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        minWidth: 0,
        width: 'auto'
    }
```

In the `useDenebState` selector, add after the `boundSignals` entry:

```ts
bindingsSettings: state.compilation.result?.parsed.bindingsSettings ??
    DEFAULT_BINDINGS_SETTINGS;
```

and add `bindingsSettings` to the destructuring list, after `boundSignals`.

Replace everything from the `// Only the live instance shows a pane.` comment to the end of the component's final `return` statement with:

```tsx
// Only the live instance shows a pane. The retained, hidden instance has
// no view of its own to bind to.
const hasBindingsPane = isActive && boundSignals.length > 0;
// A floating pane overlays the chart, so the scroll container keeps its
// full size.
const hasInlinePane = hasBindingsPane && !bindingsSettings.float;
const paneRunsAlongWidth =
    bindingsSettings.orient === 'top' || bindingsSettings.orient === 'bottom';
const inlineContainerClass = paneRunsAlongWidth
    ? classes.containerAbovePane
    : classes.containerBesidePane;
const layoutDirectionClasses: Record<BindingsOrient, string> = {
    bottom: classes.layoutPaneAtBottom,
    top: classes.layoutPaneAtTop,
    right: classes.layoutPaneAtRight,
    left: classes.layoutPaneAtLeft
};

const scrollContainer = useScrollbars ? (
    <OverlayScrollbarsComponent
        ref={osRef}
        className={mergeClasses(
            classes.container,
            hasInlinePane && inlineContainerClass
        )}
        style={scrollbarStyleVars}
        options={SCROLLBAR_OPTIONS}
        events={scrollbarEvents}
        defer
    >
        {vegaComponent}
    </OverlayScrollbarsComponent>
) : (
    <div
        ref={setFallbackElement}
        className={mergeClasses(
            classes.container,
            classes.overflowVisible,
            hasInlinePane && inlineContainerClass
        )}
    >
        {vegaComponent}
    </div>
);

return (
    <div
        className={
            hasBindingsPane
                ? mergeClasses(
                      classes.layoutWithPane,
                      layoutDirectionClasses[bindingsSettings.orient]
                  )
                : classes.layoutWithoutPane
        }
    >
        {scrollContainer}
        {hasBindingsPane && (
            <BindingsPane
                boundSignals={boundSignals}
                isActive={isActive}
                settings={bindingsSettings}
            />
        )}
    </div>
);
```

- [ ] **Step 4: Remove the collapsed flag the pane no longer reads**

In `packages/app-core/src/state/bindings.ts`, delete:

- from `BindingsSliceProperties`: the `isPaneCollapsed` member with its comment, and the `setIsPaneCollapsed` member;
- from `createBindingsSlice`: the `isPaneCollapsed: false,` line and the whole `setIsPaneCollapsed` action.

In `packages/app-core/src/state/__tests__/bindings.test.ts`, replace the first test with:

```ts
it('starts with no held values', () => {
    expect(createDenebState().getState().bindings.heldValues).toEqual({});
});
```

and delete the test named `records whether the pane is collapsed`.

- [ ] **Step 5: Run the tests**

```bash
npx prettier --write packages/app-core/src/features/visual-viewer packages/app-core/src/lib/interface packages/app-core/src/state
npm run typecheck -w @deneb-viz/app-core
npm run eslint -w @deneb-viz/app-core
npm run test -w @deneb-viz/app-core
```

Expected: all PASS, including the canary. If Prettier reflows code so that a canary pattern no longer matches, adjust the pattern, not the structure.

- [ ] **Step 6: Check it in the dev visual**

```bash
npm run dev
```

With the spec from Part 1's dev check, put this in the Config editor and confirm each point by changing one value at a time:

```json
{
    "deneb": {
        "bindings": {
            "orient": "right",
            "float": false,
            "collapsible": true,
            "collapsed": false,
            "accentColor": "#0078d4",
            "fontSize": 11
        }
    }
}
```

- Each `orient` puts the pane on that edge, and the chart fills the rest.
- `float: true` overlays the chart; the chart does not resize when the pane is collapsed or expanded.
- `collapsed: true` starts collapsed. Expanding and then changing `collapsed` in the config returns the pane to the setting.
- `collapsible: false` removes the toggle and the pane stays open.
- `accentColor`, `color`, `fontFamily`, `fontSize`, `background` and `borderColor` each change what they name.
- `"orient": "middle"` leaves the pane at the bottom and adds a warning to the editor's log.
- The slider value survives every one of these changes.

- [ ] **Step 7: Commit**

```bash
git add packages/app-core/src
git commit -m "feat(app-core): place and style the bindings pane from deneb.bindings (#275)"
```

### Task 17: Document, validate and open the pull request

**Files:**

- Modify: `CLAUDE.md`

- [ ] **Step 1: Document the settings**

In `CLAUDE.md`, add this bullet to the end of the `### Bindings Pane` list:

```markdown
- **Settings:** the pane is placed and styled by the `deneb.bindings` key of the config document (`orient`, `float`, `collapsible`, `collapsed`, and six style properties). `parseSpec` reads it into `ParsedSpec.bindingsSettings` and removes the `deneb` key before the config reaches schema validation or Vega. An invalid value falls back to its default with a warning.
```

```bash
npx prettier --write CLAUDE.md
git add CLAUDE.md
git commit -m "docs: describe the deneb.bindings settings (#275)"
```

- [ ] **Step 2: Run the local CI mirror**

```bash
npm run ci:local
```

Expected: PASS.

- [ ] **Step 3: Run the Power BI Desktop checklist**

With the packaged visual in Power BI Desktop:

- Each `orient` value, inline and floating.
- A value survives collapsing and expanding an inline pane on each edge.
- A floating pane with `"background": "rgba(255, 255, 255, 0.85)"` shows the chart through it.
- A report with a dark page background: the inline pane is transparent by default.
- A template exported with `deneb.bindings` in its config, then imported into a new Deneb visual, keeps the settings.
- The same template imported into Deneb Runtime shows the pane with those settings.

- [ ] **Step 4: Open the pull request**

```bash
git push -u origin feat/275-bindings-settings
gh pr create --base main --title "feat: place and style the bindings pane from the config (#275)"
```

The description must list the ten settings with their defaults, and end with `Closes #275`.

---

# Part 3: the Config editor schema

Start after Part 2 has merged.

```bash
git checkout main && git pull && git checkout -b feat/275-config-editor-schema
```

The Config editor has no schema in Monaco today; only the two Spec documents are registered. This part registers one for each provider's Config document, so the `deneb` key has completion and hover documentation.

- For Vega-Lite, the schema is the provider's `Config` definition with the `deneb` property added. This also gives completion for the rest of the config.
- For Vega, the provider schema types `config` as a plain object. The registered schema describes the `deneb` key and allows anything else.
- The schema used for Spec documents is not changed.

### Task 18: Build the config schemas

**Files:**

- Create: `packages/editor/src/lib/schema/deneb-config-schema.ts`
- Modify: `packages/editor/src/lib/schema/schema-service.ts`
- Modify: `packages/editor/src/lib/schema/index.ts`
- Test: `packages/editor/src/lib/schema/__tests__/schema-service.test.ts`

- [ ] **Step 1: Write the failing tests**

In `packages/editor/src/lib/schema/__tests__/schema-service.test.ts`, add `getConfigSchema` to the import from `../schema-service`.

Add this test inside `describe('before initialization', ...)`:

```ts
it('should throw from getConfigSchema when not initialized', () => {
    expect(() => getConfigSchema('vega')).toThrow('Schemas not initialized');
});
```

Add this block inside `describe('after initialization', ...)`:

```ts
describe('getConfigSchema', () => {
    it('should describe the deneb key for a Vega-Lite config and keep the rest of the config definition', () => {
        const schema = getConfigSchema('vegaLite');
        const config = schema.definitions.Config;
        expect(schema.allOf).toEqual([{ $ref: '#/definitions/Config' }]);
        expect(
            config.properties.deneb.properties.bindings.properties.orient.enum
        ).toEqual(['top', 'bottom', 'left', 'right']);
        expect(config.properties.background).toBeDefined();
    });

    it('should describe only the deneb key for a Vega config and allow anything else', () => {
        const schema = getConfigSchema('vega');
        expect(Object.keys(schema.properties)).toEqual(['deneb']);
        expect(schema.additionalProperties).toBeUndefined();
    });

    it('should describe all ten bindings settings', () => {
        const bindings =
            getConfigSchema('vega').properties.deneb.properties.bindings;
        expect(Object.keys(bindings.properties).sort()).toEqual([
            'accentColor',
            'background',
            'borderColor',
            'collapsed',
            'collapsible',
            'color',
            'float',
            'fontFamily',
            'fontSize',
            'orient'
        ]);
        expect(bindings.additionalProperties).toBe(false);
    });

    it('should add hover documentation to every bindings setting', () => {
        const { properties } =
            getConfigSchema('vega').properties.deneb.properties.bindings;
        for (const key of Object.keys(properties)) {
            expect(properties[key].markdownDescription).toBeTruthy();
        }
    });

    it('should leave the schema used for spec documents without a deneb key', () => {
        expect(
            getProcessedSchema('vegaLite').definitions.Config.properties.deneb
        ).toBeUndefined();
    });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm run build -w @deneb-viz/vega-runtime
npm run build -w @deneb-viz/app-core
npm exec -w @deneb-viz/editor -- vitest run src/lib/schema/__tests__/schema-service.test.ts
```

Expected: FAIL. `getConfigSchema` is not exported.

- [ ] **Step 3: Write the `deneb` key schema**

Create `packages/editor/src/lib/schema/deneb-config-schema.ts`:

```ts
import { BINDINGS_ORIENT_VALUES } from '@deneb-viz/vega-runtime/spec-processing';

const CSS_COLOR_NOTE =
    'Any CSS colour, for example `#0078d4` or `rgba(0, 0, 0, 0.5)`.';

/**
 * JSON schema for the `deneb` key of a config document. It exists for
 * completion and hover documentation in the config editor. The values are
 * validated when the spec is parsed, by `extractBindingsSettings`.
 */
export const DENEB_CONFIG_SCHEMA = {
    type: 'object',
    description:
        'Settings for Deneb itself. Vega and Vega-Lite never see this key.',
    additionalProperties: false,
    properties: {
        bindings: {
            type: 'object',
            description:
                'The pane that holds the controls for signals and parameters that have a `bind` property.',
            additionalProperties: false,
            properties: {
                orient: {
                    enum: [...BINDINGS_ORIENT_VALUES],
                    default: 'bottom',
                    description: 'The edge of the visual the pane sits on.'
                },
                float: {
                    type: 'boolean',
                    default: false,
                    description:
                        'Overlay the chart instead of taking space beside it.'
                },
                collapsible: {
                    type: 'boolean',
                    default: true,
                    description:
                        'Show the control that collapses and expands the pane.'
                },
                collapsed: {
                    type: 'boolean',
                    default: false,
                    description:
                        'Start with the pane collapsed. Applies only when `collapsible` is true.'
                },
                fontFamily: {
                    type: 'string',
                    description: 'Font for labels and values.'
                },
                fontSize: {
                    type: 'number',
                    exclusiveMinimum: 0,
                    description: 'Size for labels and values, in pixels.'
                },
                color: {
                    type: 'string',
                    description: `Colour of labels, values and the collapse control. ${CSS_COLOR_NOTE}`
                },
                accentColor: {
                    type: 'string',
                    description: `Colour of slider fills, checked states and the focus indicator. ${CSS_COLOR_NOTE}`
                },
                background: {
                    type: 'string',
                    description: `Pane background. Transparent by default, or white when the pane floats. An alpha value gives opacity. ${CSS_COLOR_NOTE}`
                },
                borderColor: {
                    type: 'string',
                    description: `Colour of the line between the pane and the chart. Use \`transparent\` to hide it. ${CSS_COLOR_NOTE}`
                }
            }
        }
    }
};
```

- [ ] **Step 4: Build the config schemas in the schema service**

In `packages/editor/src/lib/schema/schema-service.ts`, add this import:

```ts
import { DENEB_CONFIG_SCHEMA } from './deneb-config-schema';
```

Add after the `processedSchemas` declaration:

```ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let configSchemas: Record<string, any> = {};
```

In `doInitialize`, add after step 3 (the Vega-Lite `processedSchemas` assignment and its `await yieldToMain();`), and renumber the following comment from `4.` to `5.`:

```ts
// 4. Derive the schemas for config documents. Each adds Deneb's own
//    `deneb` key. The Vega-Lite one reuses the provider's `Config`
//    definition, sharing every other definition by reference. Vega's
//    schema types `config` as a plain object, so its config schema
//    describes the `deneb` key and allows anything else.
const denebConfigSchema = addMarkdownProps(
    structuredClone(DENEB_CONFIG_SCHEMA)
);
const vegaLiteConfigDefinition = processedSchemas.vegaLite.definitions.Config;
configSchemas.vegaLite = {
    $schema: processedSchemas.vegaLite.$schema,
    allOf: [{ $ref: '#/definitions/Config' }],
    definitions: {
        ...processedSchemas.vegaLite.definitions,
        Config: {
            ...vegaLiteConfigDefinition,
            properties: {
                ...vegaLiteConfigDefinition.properties,
                deneb: denebConfigSchema
            }
        }
    }
};
configSchemas.vega = {
    type: 'object',
    properties: { deneb: denebConfigSchema }
};
await yieldToMain();
```

In `initializeSchemas`, add `configSchemas = {};` to the `catch` block, after `processedSchemas = {};`.

Add after `getProcessedSchema`:

```ts
/**
 * Get the schema for a provider's config document, for Monaco editor
 * diagnostics configuration. It is the provider's config schema with
 * Deneb's `deneb` key added.
 * Must be called after initializeSchemas() has resolved.
 */
export const getConfigSchema = (provider: SpecProvider) => {
    if (!schemasReady) {
        throw new Error(
            'Schemas not initialized. Call initializeSchemas() first.'
        );
    }
    return configSchemas[provider];
};
```

In `packages/editor/src/lib/schema/index.ts`, add `getConfigSchema` to the export list.

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npm exec -w @deneb-viz/editor -- vitest run src/lib/schema/__tests__
```

Expected: PASS, including the existing retry test file.

- [ ] **Step 6: Commit**

```bash
git add packages/editor/src/lib/schema
git commit -m "feat(editor): build config schemas that describe the deneb key (#275)"
```

### Task 19: Register the schemas for Config documents

**Files:**

- Modify: `packages/editor/src/lib/monaco/editor-init-service.ts`
- Test: `packages/editor/src/lib/monaco/__tests__/editor-init-service.test.ts`

Monaco matches a schema to a document by the document's path. The editor builds that path as `` `deneb://${thisEditorRole}-${provider}.json` `` in `specification-json-editor.tsx`, and `active-editor-pane-router.tsx` mounts the config editor with the role `Config`. The two Config documents are therefore `deneb://Config-vegaLite.json` and `deneb://Config-vega.json`.

- [ ] **Step 1: Write the failing test**

In `packages/editor/src/lib/monaco/__tests__/editor-init-service.test.ts`, replace the schema service mock with:

```ts
vi.mock('../../schema', () => ({
    initializeSchemas: initializeSchemasMock,
    getProcessedSchema: vi.fn((provider: string) => ({
        $schema: `https://example.com/${provider}`,
        type: 'object'
    })),
    getConfigSchema: vi.fn((provider: string) => ({
        title: `config-${provider}`,
        type: 'object'
    }))
}));
```

Add this test after `should configure Monaco JSON diagnostics with schemas`:

```ts
it('should register a schema for each provider config document', async () => {
    vi.resetModules();
    mockSetDiagnosticsOptions.mockClear();
    const service = await import('../editor-init-service');
    await service.initializeEditorDependencies();
    const { schemas } = mockSetDiagnosticsOptions.mock.calls[0][0] as {
        schemas: {
            uri: string;
            fileMatch: string[];
            schema: { title?: string };
        }[];
    };
    const titleByDocument = Object.fromEntries(
        schemas.map((entry) => [entry.fileMatch[0], entry.schema.title])
    );
    expect(titleByDocument['deneb://Config-vegaLite.json']).toBe(
        'config-vegaLite'
    );
    expect(titleByDocument['deneb://Config-vega.json']).toBe('config-vega');
    expect(schemas).toHaveLength(4);
    expect(new Set(schemas.map((entry) => entry.uri)).size).toBe(4);
});
```

Run:

```bash
npm exec -w @deneb-viz/editor -- vitest run src/lib/monaco/__tests__/editor-init-service.test.ts
```

Expected: FAIL in the new test. Only two schemas are registered.

- [ ] **Step 2: Register the schemas**

In `packages/editor/src/lib/monaco/editor-init-service.ts`, replace the schema import with:

```ts
import {
    initializeSchemas,
    getConfigSchema,
    getProcessedSchema
} from '../schema';
```

In `configureMonacoDiagnostics`, add these two entries to the `schemas` array, after the Vega entry:

```ts
            {
                schema: getConfigSchema('vegaLite'),
                uri: 'deneb://schemas/config-vegaLite.json',
                fileMatch: [
                    monaco.Uri.parse('deneb://Config-vegaLite.json').toString()
                ]
            },
            {
                schema: getConfigSchema('vega'),
                uri: 'deneb://schemas/config-vega.json',
                fileMatch: [
                    monaco.Uri.parse('deneb://Config-vega.json').toString()
                ]
            }
```

Update the function's comment to:

```ts
/**
 * Configure Monaco JSON diagnostics with the pre-processed Vega/Vega-Lite
 * schemas for spec documents, and with the config schemas for config
 * documents. Enables schema-based validation and intellisense in the editor.
 */
```

- [ ] **Step 3: Run the tests**

```bash
npx prettier --write packages/editor/src/lib/schema packages/editor/src/lib/monaco
npm run test -w @deneb-viz/editor
npm run eslint -w @deneb-viz/editor
```

Expected: all PASS.

- [ ] **Step 4: Check it in the dev visual**

```bash
npm run dev
```

In the Config editor, for a Vega-Lite visual and then a Vega visual:

- Typing `"de` offers `deneb`, then `bindings`, then the ten settings.
- `orient` offers its four values.
- Hovering a setting shows its description.
- `"orient": "middle"` is underlined.
- For Vega-Lite, other config keys such as `axis` now complete too.
- The Spec editor behaves as before, and a spec with an inline `config` block does not offer `deneb`.

- [ ] **Step 5: Commit**

```bash
git add packages/editor/src/lib
git commit -m "feat(editor): give the config editor a schema with the deneb key (#275)"
```

### Task 20: Validate and open the pull request

- [ ] **Step 1: Run the local CI mirror**

```bash
npm run ci:local
```

Expected: PASS.

- [ ] **Step 2: Check the bundle**

```bash
npm run package
```

Expected: the main visual stays under the 2MB limit. The config schemas reuse the provider schema's definitions by reference, so the growth is the `deneb` key schema alone. Deneb Runtime does not include the editor and is unaffected.

- [ ] **Step 3: Open the pull request**

```bash
git push -u origin feat/275-config-editor-schema
gh pr create --base main --title "feat(editor): complete and document the deneb config key (#275)"
```

The description must say that the config editor gains schema completion for the first time, and that for Vega-Lite this covers the whole config.
