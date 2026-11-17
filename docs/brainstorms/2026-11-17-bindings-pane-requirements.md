# Bindings pane: Deneb-rendered controls for bound signals

**Issues:** #275 (binding format options) and #346 (custom container for input
bindings), both on the 2.1 milestone.
**Branch:** `feat/bindings-pane`, an integration branch off `main` that each
part merges into.
**Supersedes:** the "Parameter bindings (future)" note in the
[container-signal consolidation design](../plans/2026-07-23-001-container-signal-consolidation-design.md).

A Vega signal or Vega-Lite parameter with a `bind` property gets an input
control. Today Vega builds those controls itself and appends them under the
chart. This spec replaces that with a pane that Deneb owns: Deneb renders the
controls, places them, and keeps their values alive when the view is rebuilt.
The author writes `bind` exactly as they do now.

## Problem

Vega appends a `form.vega-bindings` element inside the embed root, after the
chart. Deneb gives it four CSS rules and otherwise leaves it alone. Three
things follow.

- **The controls cannot be styled to fit a report.** They are browser-default
  form elements. #275 asks for control over colour and type, and a later
  comment on it reports visuals being ruled out because the controls do not
  match the surrounding Power BI app.
- **The controls take space the spec cannot see.** The form sits inside the
  scroll container as scrollable content, so `denebContainer` and Vega-Lite's
  `container` sizing report the full box. Authors hand-subtract room for the
  controls, or accept a scrollbar. This is #346.
- **Bound values reset when the view is rebuilt.** A change to the container's
  box rebuilds the view from the compiled spec
  ([use-container-signal-owner.ts](../../packages/app-core/src/features/visual-viewer/use-container-signal-owner.ts)),
  and nothing restores signal values afterwards. A slider returns to its
  default when the visual is resized.

A v2 prototype solved the first two by pointing Vega's form at a Deneb-owned
element and restyling Vega's generated DOM with CSS. It worked, and the
screenshots in the
[#275 story comment](https://github.com/deneb-viz/deneb/issues/275#issuecomment-4210511038)
are real captures of it. It was not carried forward because it depended on
Vega's generated markup, needed vendor-specific CSS to approximate the Fluent
look, and needed 29 configuration properties with their own schema, settings
UI and template object.

## Goals

- An author adds `bind` to a signal or parameter and gets a working control,
  with no Deneb-specific steps.
- The controls look like the rest of Deneb and Power BI by default.
- The pane takes its own space, so responsive specs size to what is left.
- The author can place the pane, float it, and let the reader collapse it.
- Bound values survive every view rebuild.
- A control always shows the signal's current value, whatever changed it.
- Deneb uses only documented Vega and vega-embed surfaces, and does not depend
  on Vega's generated DOM.
- The configuration is small enough to maintain and to learn.

## Non-goals

- A settings UI in the editor. Configuration is JSON only in this version; a
  UI can be built on the same settings later if the feature proves itself.
- Format-pane settings for the pane in Deneb Runtime.
- Keeping values or the collapsed state across sessions or bookmarks.
- Per-control options beyond what `bind` already expresses.
- A reset-to-defaults button, pane size options, a separate style set for the
  collapsed state, and a choice of corner for the collapsed toggle.
- Keeping Vega's own rendering as an alternative. There is one rendering path.

## Decisions

| Question                           | Decision                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| Who renders the controls?          | Deneb, as Fluent components. Vega's form is switched off.                          |
| How are controls bound to signals? | Through the View API: `view.signal()` and signal listeners. Not `bind.element`.    |
| Where do the pane's settings live? | Under a `deneb.bindings` key in the config document.                               |
| How much is configurable?          | Ten properties: four for layout, six for style.                                    |
| What happens to existing reports?  | Every visual with bindings gets the pane on upgrade. No opt-in and no legacy mode. |
| Is there a settings UI?            | Not in this version.                                                               |

## Approach

Three ways of owning the controls were considered.

**Vega's widgets in a Deneb container.** This is the prototype: the View's
`bind` container option, plus CSS over Vega's markup. Rejected for the reasons
given under Problem.

**`bind.element`.** Vega can bind a signal to an existing external element
instead of generating one. Rejected because of how that binding behaves
(`bind.js` and `initialize.js` in the `vega-view` package):

- On initialisation the element's `value` overwrites the signal, so the spec's
  own `value` is ignored.
- Vega reads the raw `value`, which is a string for native inputs, and skips
  the option lookup that gives `select` and `radio` typed values.
- The element must exist before the view initialises. For Vega-Lite the `bind`
  definitions only exist once vega-embed has compiled the spec, which is
  mid-embed. Deneb would end up binding to stand-in objects.

**The View API.** This is the chosen approach. Vega's own binding is a thin
layer over `view.signal(name, value)` and a signal listener, so Deneb can do
the same thing directly:

- `bind` is only legal on top-level signals; Vega's parser rejects it anywhere
  else. The bound signals of any compiled spec are therefore a flat list.
- The config value `events.bind: 'none'` stops Vega building any form.
- vega-embed's `patch` option hands Deneb the compiled Vega spec before it is
  parsed, for both providers.

Every surface used is documented: the View API, the `patch` embed option, the
`events.bind` config value and the `bind` definition format. Deneb already
drives `denebContainer` through the same View API.

This was checked with a headless probe against the installed Vega and
Vega-Lite. A Vega-Lite spec with a range parameter, a checkbox, a radio group
and a point selection bound to a dropdown compiled to four top-level signals
with their `bind` definitions intact; a legend binding correctly produced
none. Setting the signals through `view.signal()` fired the listeners and
updated the selection store. With `events.bind: 'none'` Vega rendered no
widgets, against four without it, and the signals stayed drivable.

## Design

### Compile time

`parseSpec` gains two outputs on its result, alongside the existing spec and
config.

**Pane settings.** Config parsing lifts the `deneb` key out of the config
document, validates `deneb.bindings` into a settings object, and passes the
remaining config on unchanged. The `deneb` key must be removed before schema
validation and before the config reaches vega-embed, because Vega-Lite's
config schema rejects unknown keys. Only the config document is read; a
`deneb` key inside a spec's inline `config` block is not.

**Bound signals.** The validation step already parses a Vega spec and
compiles a Vega-Lite spec, then discards the result
([parse.ts](../../packages/vega-runtime/src/lib/spec-processing/parse.ts)).
The bound signals are taken from that step, so there is no additional compile:
the spec's top-level `signals` for Vega, and the compiled output's top-level
`signals` for Vega-Lite. A signal is bound when its `bind` has an `input`.
Each entry records the signal name, the `bind` definition, and the signal's
`value`, `init` and `update` as written. Order follows the compiled spec,
which is the order Vega renders them in today.

Both outputs land on the compile result. The two viewer instances already
share that result, and it is available before the first embed.

### Embed time

`VegaEmbed` passes a `patch` function in its embed options. It runs on the
compiled Vega spec for both providers and does two things.

- It sets `config.events.bind` to `'none'`, keeping the rest of the config
  and any other `events` keys.
- It records which bound signals the spec was built from. vega-embed hands
  the patched spec back with the view, so the view can be tied to exactly
  those definitions.

It does not seed held values into the spec. Vega skips signal-triggered
handlers on a view's first run, so a seeded Vega-Lite selection shows one
value in its control and filters by another. Held values are written after
the first run instead, as described under Runtime.

Two constraints apply to the function.

- It must copy rather than mutate. The compiled template in the store is
  reused across embeds.
- Its identity must be stable across renders. `useVegaEmbed` deep-compares
  its options and compares functions by identity, so a new function on each
  render would re-embed continuously. The function reads the store at call
  time rather than closing over it.

### Runtime

**Held values.** The store holds a map from bound signal name to its
last-known value. It is shared by both viewer instances, lasts for the
session, and is not persisted. It is the single source for what the controls
show and for what a new view is given.

**When a view is built**, the embed callback ties it to the bound signals its
spec was built from and writes the held values to it. A held value of `null`,
`false` or `0` is still a held value; the test is presence, not truthiness.
This happens in the same turn as the embed, so the values are in place before
the view's first frame is painted.

**When the pane attaches to a view**, in this order:

1. For each bound signal without an `update` expression, if a held value
   exists and differs from the view's value, write the held value to the view.
   This applies input that arrived while the view was being rebuilt.
2. Record the view's current value for every bound signal as its held value.
3. Listen to every bound signal and record each change as its held value.

The pane attaches with the view's own bound signals, not the latest compile's.
A view that is about to be replaced therefore cannot record its values under
an edited definition.

**When the reader changes a control**, the new value is recorded as the held
value first, then written to the view. The control therefore responds
immediately. Every write sets its signal at the start of a run, which is how
Vega's own binding writes; a signal set directly while a run is paused on a
data load can be lost. `bind.debounce`, when set, delays the write to the
view as it does in Vega. A failed run is caught and logged; it does not
surface to the reader.

**After a write, the layout is refitted when it needs to be.** Vega lays a
view out on its first run and does not revisit the layout when a signal
changes what is drawn. A control could otherwise push part of the chart out
of view. When a filter leaves a single bar, for example, the axis rescales,
the bar nearly fills the plot, and its label pushes the title above the top
of the view. After a write, if the room the drawn content needs around the
plot has changed, the view's layout is recomputed until the content fits. A
write that leaves that room unchanged recomputes nothing, and a burst of
writes, such as a slider being dragged, is fitted once after the last. The
same happens when held values are written to a new view. A view of fixed
size refits inside it; a view on `pad` grows or shrinks.

**A control shows the held value.** Before the first view is ready there is
none, and the control shows the `value` from the signal's definition if it has
one.

**A held value applies only to the definition it was captured under.** Each
one records its signal's definition as written: the `bind`, the `value`,
`init` and `update`, the `on` event handlers and `react`. Once any of those
changes, the held value is ignored, so editing a signal's default, its
options or its event handlers resets it. A `description` is not part of the
definition, and an edit elsewhere in the spec resets nothing. A failed
compile does not touch held values.

**Two viewer instances.** Only the active instance renders a pane and talks
to its view.

This gives the two required behaviours. A resize, a zoom or renderer change,
or a large-data recompile each build a new view, and each new view shows the
held values on its first painted frame. A value changed by an `on` handler or by
another signal reaches the control through the listener and becomes the held
value.

The pane's space is reserved before the first embed, because the bound
signals are known at compile time. The chart does not render at full size and
then shrink.

### Controls

Controls are Fluent components rendered in app-core's viewer layer.

| `bind.input`   | Control                     | Value written     |
| -------------- | --------------------------- | ----------------- |
| `range`        | Slider with a value readout | number            |
| `checkbox`     | Checkbox                    | boolean           |
| `radio`        | RadioGroup                  | the option itself |
| `select`       | Select                      | the option itself |
| `color`        | native colour input         | string            |
| any other type | Input of that type          | string            |

A spec must behave the same in Deneb as in the Vega editor, so the controls
follow the rules in Vega's own implementation (`bind.js` in the `vega-view`
package):

- The label is `bind.name`, or the signal name when there is none.
- `bind.labels` names the options of `select` and `radio`. Options keep their
  JSON type, including `null`.
- An option matches the current value when they are identical or when their
  string forms are equal.
- `range` uses Vega's defaults for `min`, `max` and `step`, and shows the
  midpoint when the signal has no value. The default limits come from the
  value the signal is defined with, as Vega takes them from the value it has
  when the widget is built, so they do not move with the slider. A signal
  defined without a value takes them from its current value.
- A slider shows Fluent's step marks only when it has twenty steps or fewer.
  With more, the marks cover the rail, and Vega's default is about a hundred
  steps.
- Other input types write strings, including `number`. Vega does the same.
- A `color` control shows any CSS colour the signal holds, converted to the
  six-digit form the native input needs, and writes that six-digit form.
- A `select` whose signal value matches none of its options shows nothing
  chosen.
- `bind.element` is ignored. The pane is the container.

These differ from Vega deliberately.

- **Select, not Dropdown.** Fluent's Select uses the browser's native popup.
  A long list is then not clipped by the visual's frame and is not mis-scaled
  under the editor's preview zoom.
- **An attribute allowlist.** Vega copies every `bind` property onto a generic
  input as an attribute. Deneb passes `placeholder`, `autocomplete`, `min`,
  `max`, `step`, `minlength`, `maxlength` and `pattern`, and nothing else. An
  input type that Fluent's Input does not support, other than `color`, renders
  as text.
- **Bindings are sanitised.** A spec is free-form JSON. `name` is used only
  as text, and `options` and `labels` only as arrays, so nothing from a spec
  can reach a component as properties.
- **A pane that fails disappears.** If a control throws on a value it cannot
  show, the pane is removed and the chart stays up. It returns when the bound
  signals are redefined.

Labels are associated with their controls. The collapse toggle exposes its
expanded state and is reachable by keyboard. Its label is "Hide controls" or
"Show controls", supplied through app-core's i18n.

### Layout

```
viewer            flex; direction follows orient
├─ scroll container   existing, measured, takes the remaining space
└─ pane               new, sized to content up to a cap, scrolls internally
```

- **Inline.** The pane is a sibling of the measured container, never a
  descendant of it. The measured container is the scroll container, or the
  plain element that stands in for it when scrollbars are off. When the pane
  appears, grows or collapses, the measured box changes and the existing
  resize path rebuilds the view at the new size. `useContainerSignalOwner` is
  not changed.
- **Float.** The pane is positioned over the chart on the `orient` edge and
  sized as it would be inline. The measured box does not change, so showing
  or hiding it rebuilds nothing.
- **Rows.** Each signal has a row of its own on every edge. Every control,
  the checkbox included, is named by a label, so every row reads the same
  way. A control never takes more width than its row has: a long option is
  cut short, a long label wraps, and the options of a radio group wrap.
- **Top or bottom.** The pane spans the full width. Each label sits beside
  its control, so the labels form one column and the controls another, as in
  Vega's own form. The rows start at the left and are at most 28em wide, so
  that a wide visual does not put a label far from its control. The toggle
  is at the far end of the pane.
- **Left or right.** Each label sits above its control. The gap between two
  rows is wider than the gap between a label and its control, which shows
  which label belongs to which control.
- **Cap.** The pane takes at most 40% of the visual's height on the top or
  bottom, and at most 40% of its width on the left or right. It scrolls
  internally beyond that. The figure is a starting point to tune during the
  build.
- **Collapse.** The toggle sits in the pane. When collapsed, the pane leaves
  the layout and a small button overlays the chart in the corner nearest
  `orient`: bottom-right for `bottom`, top-right for `top` and `right`, and
  top-left for `left`. The collapsed state is shared by both viewer instances,
  lasts for the session, and starts from the `collapsed` setting. Changing
  that setting, or `collapsible`, resets it.
- **No bound signals.** Nothing renders, and the layout is exactly today's.

`denebContainer` was made element-measured so that anything beside the
drawable area would be accounted for. This design relies on that. It reverses
the consolidation design's note that bindings stay scrollable content inside
the scroll container; that note is to be marked as superseded.

### Look

The viewer path has no Fluent provider today, so the pane brings its own. It
uses Deneb's light theme with the style settings applied over it.

The pane looks the same in the editor preview and in the report. It does not
follow the editor's dark theme, so the preview stays faithful.

### Configuration

The settings live in the config document:

```jsonc
{
    "deneb": {
        "bindings": {
            "orient": "right",
            "float": true,
            "accentColor": "#af2f72"
        }
    }
}
```

| Property      | Type                                     | Default                                      | Purpose                                                                                       |
| ------------- | ---------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `orient`      | `"top"`, `"bottom"`, `"left"`, `"right"` | `"bottom"`                                   | The edge the pane sits on.                                                                    |
| `float`       | boolean                                  | `false`                                      | Overlay the chart instead of taking space.                                                    |
| `collapsible` | boolean                                  | `true`                                       | Show the collapse toggle.                                                                     |
| `collapsed`   | boolean                                  | `false`                                      | Start collapsed. Applies only when `collapsible` is true.                                     |
| `fontFamily`  | font names, separated by commas          | theme font                                   | Font for labels and values.                                                                   |
| `fontSize`    | number from 1 to 100, in px              | theme body size                              | Size for labels and values.                                                                   |
| `color`       | CSS colour                               | theme foreground                             | Labels, values and the toggle. Text inside a dropdown or a text input keeps the theme colour. |
| `accentColor` | CSS colour                               | theme brand colour                           | Slider fill, checked states and focus.                                                        |
| `background`  | CSS colour                               | `"transparent"` inline, `"#ffffff"` floating | Pane background. Alpha gives opacity.                                                         |
| `borderColor` | CSS colour                               | theme neutral stroke                         | The line between pane and chart. `"transparent"` hides it.                                    |

The inline default for `background` is transparent so that a report on a dark
page does not gain a white band on upgrade. The floating default is white so
the pane stays legible over the chart.

`orient` is Vega's own word for legend, axis and title placement. Font size is
in pixels, as it is elsewhere in a Vega config.

A font family and a colour are written into a stylesheet as text, so only
plain values are accepted:

- A font family is a list of names separated by commas. Each name is made of
  letters, with their combining marks, digits, spaces, hyphens and
  underscores, and may have quotes around it. The list is rebuilt from those
  names and is never passed on as the author wrote it.
- A colour is a hex value, a colour name, or one colour function such as
  `rgb()` or `hsl()` with plain arguments. `var()`, `url()`, `color-mix()`
  and a function inside a function are refused.
- A value that would take its meaning from the surroundings is not accepted
  as a colour: `inherit`, `initial`, `unset`, `revert` and `currentcolor`. As
  a font name, such a keyword is quoted, so that it names a font. The pane
  would otherwise look different in the editor's preview and in a report.
- A font size is a number from 1 to 100.

An invalid value falls back to its default and adds a warning to the compile
result, which the editor shows in its log. An unrecognised key under `deneb`
or under `deneb.bindings` is ignored with a warning of the same kind, which
catches typos. Neither is an error, and neither is shown to a report reader.

Config is already persisted, already travels inside a template, and already
reaches Deneb Runtime when a template is imported. The settings therefore
need no new persisted property and no change to the template format.

### Config editor schema

The Config editor has no schema in Monaco today; only the two Spec documents
are registered
([editor-init-service.ts](../../packages/editor/src/lib/monaco/editor-init-service.ts)).
A schema is to be registered for Config documents so the `deneb` key has
completion and hover documentation.

- For Vega-Lite, it is the provider schema's `Config` definition with the
  `deneb` property added. This also gives completion for the rest of the
  config.
- For Vega, the provider schema types `config` as a plain object. The
  registered schema describes the `deneb` key and allows anything else.
- The schema used for Spec documents is not changed.

This piece is separable and can ship after the pane.

## Behaviour change for existing reports

AppSource updates installed visuals without the author acting, so every
report with bound signals changes on upgrade. The defaults keep the change
small: the pane sits at the bottom, inline and expanded, where Vega put the
controls.

- The controls take the Fluent look, and a collapse toggle appears.
- The chart gets the space left after the pane, where before the controls
  scrolled beneath a full-size chart.
- Specs that size responsively fit better than before.
- Specs that hand-subtracted room for the controls show a spare band until the
  author removes the workaround.
- Bound values now survive a resize.
- Nothing errors, and no spec needs to change to keep working.

The release notes must describe this change.

## Known limits

- A bound signal driven by an `update` expression is never written to. Vega
  re-evaluates the expression on every new view.
- A direct binding, with `element` and no `input`, is ignored. There is no
  author-owned DOM inside the visual for it to target.
- A compile error hides the pane until the spec compiles again.
- The layout is refitted only for changes the pane makes. A selection made in
  the chart itself, or a cross-filter update, leaves the layout as Vega's
  default does, which can cut content off in a view of fixed size.
- vega-embed merges a spec's own `usermeta.embedOptions` over the options
  Deneb passes. A spec that sets `patch` there displaces Deneb's function.
  This is unsupported, and no code guards against it.

## Where the code goes

- **vega-runtime:** reading and validating the settings, extracting bound
  signals, the patch, Vega's control rules, and attaching controls to a view.
  None of it depends on React.
- **app-core state:** held values and the collapsed state.
- **app-core `features/visual-viewer`:** the pane, its controls and the
  layout change. It belongs to this feature because the pane sits inside the
  viewer's layout and cross-feature imports are rejected.
- **editor:** the Config schema registration only.
- **apps/deneb and apps/viewer:** the `.vega-bindings` and `.vega-bind` rules
  in each app's `visual.less` are deleted.

Nothing on the viewer path may import from the editor. The existing
architecture and reachability canaries must pass unchanged.

## Testing

**Unit**

- Bound-signal extraction for Vega and for Vega-Lite, including a selection
  bound to an input, a selection with one input per projected field, and a
  legend binding that must produce nothing.
- The patch: the input is not mutated, `events.bind` is set while other
  config survives, and signals are left as written.
- Bindings: a `name` that is not text, and `options` or `labels` that are not
  arrays, are dropped.
- Settings parsing: defaults, each invalid value, an unrecognised key, and
  the `deneb` key being absent from the config that is passed on.
- Held values: one is ignored once its signal's definition changes, and
  still applies when nothing changes.
- Vega's control rules: range defaults, option matching and labels, input
  types and the attribute allowlist.

**View wiring**

app-core has no component-render tests. Its vitest runs in node, and wiring
is pinned by source canaries. The pane's logic therefore lives in plain
functions that are tested directly.

- Against a real headless view: a write reaches the signal, a signal change
  is recorded, a value held while no view was ready is applied when one is,
  an `update`-driven signal is not written, and nothing is recorded after
  disposal.
- A Vega-Lite point selection bound to a select shows the rows its held value
  selects once the held values are written, for a value and for `null`.
- A write made while a run is paused on a data load is still applied.
- After a write that changes the room the content needs, nothing is cut off.
  A write that does not change it recomputes nothing, and a burst of writes
  is fitted once.
- The function passed as `patch` is declared once at module level, so a pane
  re-render cannot re-embed the view.

**Canaries**

- A new one pins the pane as a sibling of the measured container, not a
  descendant of it, and pins the pane's wiring: the `patch` option, the
  session hook and the gate on writes.
- The existing container-signal wiring canary passes without modification.

## Validation gates

**Power BI Desktop**, with the packaged visual:

- A slider value survives resizing the visual.
- A value survives collapsing and expanding an inline pane.
- A Vega-Lite selection bound to a dropdown filters the chart.
- Each `orient` value, inline and floating.
- A responsive spec fills the space left by an inline pane with no scrollbar.
- A report with a dark page background.
- Interacting with the pane does not clear or change a cross-filter.
- Deneb Runtime: importing a template whose config sets `deneb.bindings`.

**Bundle size.** Both packaged visuals are measured before and after, against
the 2MB limit. Deneb Runtime gains Slider, Select, Radio and Checkbox, which
it does not ship today. The main visual already ships them through the
editor.

## Delivery

One plan, landing as three pull requests into `feat/bindings-pane`, an
integration branch off `main`. That branch merges to `main` once the three
parts have been tested together as a complete feature, and the merge closes
both issues.

1. **The engine and the pane with default settings.** Bound-signal extraction,
   the patch, held values, the controls, the layout and the removal of the old
   styles. This is the always-on switch. It delivers #346.
2. **The `deneb.bindings` key.** Settings parsing, the layout options and the
   style settings. It delivers #275.
3. **The Config editor schema.**

The consolidation design's note is marked as superseded in the first pull
request. User documentation lives in the docs repository and follows
separately.

## Risks

- **A visible change in live reports that nobody asked for.** The defaults
  mirror today's placement, the inline background is transparent, and the
  release notes call it out. This was accepted in preference to carrying a
  second rendering path.
- **Drift from Vega's binding rules.** Deneb now owns the rules that Vega's
  widgets followed. The surface is small and has been stable for years, and
  the parity tests encode it. It needs a check when Vega is upgraded.
- **An unstable `patch` function.** It would cause continuous re-embedding. A
  test covers it.
- **Small visuals.** The cap and internal scrolling keep the chart at 60% or
  more, and the collapsed toggle is always reachable.
- **Bundle growth in Deneb Runtime.** It is measured as a gate.

## Changes made during implementation

Part 1 was built on 2026-11-17. A review of the finished branch found four
defects in the design as first written, and the sections above now describe
what was built. What changed, and why:

- **Held values are written after a view's first run, not seeded into the
  spec.** Vega skips signal-triggered handlers on a first run. A Vega-Lite
  point selection bound to a dropdown, seeded with one option, kept filtering
  by the spec's initial option. Writing the value after the first run is the
  path an interaction takes, and it is right for a value and for a cleared
  selection.
- **The pane attaches with the view's own bound signals.** Attached with the
  latest compile's list, a view that was about to be replaced recorded its old
  values under an edited signal's new definition, so an edited default never
  took effect.
- **Bindings are sanitised where they are read from the spec.** An object in
  `bind.name` reached a Fluent slot as component properties, which could make
  the certified visual request an external address. A non-array `options`
  stopped the pane from rendering.
- **A pane that throws is contained.** It sits inside the embed's
  blank-on-error boundary.
- **Every write is made at the start of a run.** This is how Vega's own
  binding writes. A signal set directly while a run was paused on a data load
  was lost.
- **The layout is refitted after a write.** Found while testing in Power BI
  Desktop: a dropdown that filtered a bar chart to a single bar pushed the
  title out of view. Recomputing on every write was not safe, because some
  layouts never settle and would move on every slider step. So the layout is
  recomputed only when the room the content needs has changed, and then
  until the content fits.
- **A slider keeps its default limits and its rail.** Both faults were found
  after the pull request was opened. The default limits followed the current
  value, so a slider with no `max` that started at 250 lost its top end when
  it was moved down. And Fluent's step marks covered the rail of any slider
  with about a hundred steps or more, which is Vega's default.
- **A signal's definition includes its event handlers.** As first built, a
  held value was tied to the `bind`, `value`, `init` and `update` only, so
  editing just an `on` handler left the old value in place. The definition
  now also covers `on` and `react`.
- **Smaller changes:** a colour control shows a named colour as itself, a
  select with no matching option shows nothing chosen, and the pane keeps one
  toggle button in both states so that it keeps keyboard focus.

Part 2 was built on 2026-11-18. What changed from the design above, and why:

- **Settings are treated as untrusted text.** The first design accepted any
  text as a font family, and any colour the platform's own check accepted.
  Fluent's provider writes theme values into a stylesheet rule as text, so a
  crafted font family could add a declaration and make the visual request an
  external address, and the platform accepts `var()` with a `url()` inside
  it. A font family is now rebuilt from checked names, a colour must have a
  plain shape, and a font size is bounded.
- **The reader's collapse choice is cleared when the setting changes.** The
  first design kept the choice with the setting it was made under and
  ignored it while the two differed. A setting that was changed and then
  changed back brought an old choice into force again. The choice is now
  cleared where a compile lands, which sees every change of `collapsed` and
  of `collapsible`.
- **Text inside a field keeps the theme's colour.** `color` is for text drawn
  on the pane itself. A dropdown and a text input keep their own light
  background, so a light `color`, set for a dark report page, would have made
  the text inside them unreadable.
- **The toggle is reached in the order it is drawn.** On a left or right pane
  it is drawn above the controls, and it now comes before them for the
  keyboard too.
- **`fontSize` reaches every control.** The controls are the small size of
  Fluent's components, whose labels, dropdowns and text inputs take a
  different step of the type ramp from checkbox and radio labels. The
  setting now sets both steps.
- **Each signal has a row of its own.** The first design let the controls of
  a top or bottom pane flow along a line and wrap. Seen in a report, they
  landed wherever they fitted, with their labels and controls out of line.
  On a left or right pane, a label was as near to the control above it as to
  its own. Every edge now has one row for each signal: label beside control
  in two columns on the top and bottom, label above control on the left and
  right. The checkbox takes its name from a label like every other control,
  and the space that Fluent puts around a checkbox and a radio button is
  taken back, so that all controls start on one line and all rows are one
  height. The options of a radio group and the value of a slider are shown
  at the size of the labels.
- **Smaller changes:** the toggle keeps its size when the controls of a left
  or right pane overflow, and the `deneb` key is also removed from the
  config that the editor's compiled Vega view compiles with.

One point is left open. When a spec compiles but its view fails to
initialise, the pane still shows above a blank chart. Hiding it needs a record
that the view failed, which the store does not keep today.
