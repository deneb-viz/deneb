---
title: 'The Power BI webpack plugin replaces, rather than merges, string resource files that share a locale'
date: 2026-11-06
category: build-errors
module: powerbi-host
problem_type: build_error
component: tooling
severity: medium
symptoms:
    - 'The format pane shows raw keys such as `Objects_Vega_EnableTooltips` instead of their text'
    - 'Only the keys from one of the listed files are missing, so the pane looks half translated'
    - 'Webpack, the plugin and packaging all succeed: nothing fails at build time'
root_cause: wrong_api
resolution_type: tooling_addition
related_components:
    - development_workflow
tags:
    [
        powerbi-visuals-webpack-plugin,
        string-resources,
        localization,
        format-pane,
        webpack,
        en-us
    ]
---

# The Power BI webpack plugin replaces, rather than merges, string resource files that share a locale

## Problem

Both visuals (Deneb and the viewer-only build of Deneb) show the same format pane strings, and Deneb's settings pane shows some of them too. The shared strings live in two files in `packages/powerbi-host`:

- `stringResources/en-US.json`: the format pane's own strings.
- `src/i18n/settings-pane.en-US.json`: the strings a visual's settings pane also shows. It sits under `src/` so tsc emits it for the TypeScript export `SETTINGS_PANE_TRANSLATIONS`.

Power BI only sees the strings `powerbi-visuals-webpack-plugin` writes into the package. The plugin keeps one listed file per locale, so passing it both files for `en-US` drops one file's keys.

## Symptoms

What you would see if both files are listed:

- The format pane shows raw keys instead of text, for the keys of whichever file the plugin didn't keep.
- Nothing fails: webpack, the plugin and `pbiviz package` all succeed.

## What Didn't Work

This was caught by reading the plugin's source before implementing, not by a failure. Two approaches were rejected on that reading:

1. **Listing both JSON files in the plugin's `stringResources` option.** The plugin stores each listed file by locale, so a later file replaces an earlier one:

    ```js
    // node_modules/powerbi-visuals-webpack-plugin/src/extractor/localization.js
    source1.forEach((res) => {
        if (!res) return;
        stringResources[res.locale] = res.values; // the last file for a locale wins
    });
    ```

2. **Listing every file in a `stringResources/` folder**, as the webpack configs once did with a `readdir`. That fails the same way as soon as two files share a locale.

The app's own `stringResources/<locale>/resources.resjson` is read separately and _is_ merged over the listed files, key by key:

```js
if (stringResources[res.locale]) {
    // resjson string rewrites exist keys
    for (let key in res.values) {
        stringResources[res.locale][key] = res.values[key];
    }
}
```

So an app's keys win over the shared ones, which is what we want. The shared strings just have to reach the plugin as one file per locale.

## Solution

`packages/powerbi-host/build/string-resources.cjs` merges the two files and writes the result where the build owns it. It throws if both files define a key, rather than letting one silently win:

```js
const readSharedStringResources = () => {
    const formatPane = readJson('stringResources', 'en-US.json').values;
    const settingsPane = readJson('src', 'i18n', 'settings-pane.en-US.json');
    const duplicates = Object.keys(settingsPane).filter(
        (key) => key in formatPane
    );
    if (duplicates.length > 0) {
        throw new Error(
            `Shared strings defined twice: ${duplicates.join(', ')}`
        );
    }
    return { ...formatPane, ...settingsPane };
};
```

`writeSharedStringResources(outDir)` writes `{ locale: 'en-US', values }` to `outDir/en-US.json` and returns its path relative to `process.cwd()`, the form the plugin's `stringResources` option takes.

`apps/deneb/webpack.common.config.js` and `apps/viewer/webpack.common.config.js` use it the same way:

```js
const { writeSharedStringResources } = require('../../packages/powerbi-host/build/string-resources.cjs');
const sharedStringResourcesDir = path.join(__dirname, '.tmp', 'stringResources');
const sharedStringResources = writeSharedStringResources(sharedStringResourcesDir);

// plugins:
new PowerBICustomVisualsWebpackPlugin({
    ...pbivizFile,
    stringResources: sharedStringResources,
    // ...
}),
{
    apply: (compiler) =>
        compiler.hooks.beforeCompile.tap('SharedStringResources', () =>
            writeSharedStringResources(sharedStringResourcesDir)
        )
},
```

The call at config load is needed because the plugin reads its options then. The `beforeCompile` hook rewrites the file before every compile, so each build reads the strings as they are now.

## Why This Works

The plugin sees exactly one listed file per locale, so nothing gets replaced. The app's `resources.resjson` still merges over it, so a visual can override a shared key. The merge happens in our code, where a key defined twice throws instead of disappearing.

## Prevention

- `apps/deneb/src/__test__/invariants/settings-resource-keys.test.ts` resolves every `displayNameKey`, `descriptionKey`, `disabledReasonKey` and `i18n` key in the settings models against the combined set (both shared files plus the app's resjson), and keeps app keys out of the shared files. A typo becomes a CI failure instead of a raw key in production.
- `apps/viewer/src/__test__/invariants/format-pane-resources.test.ts` makes the same check for the viewer-only build.
- `apps/deneb/src/__test__/invariants/translation-keys-disjoint.test.ts` keeps the kernel strings, `SETTINGS_PANE_TRANSLATIONS` and the app's strings free of shared keys, since a later catalog silently shadows an earlier one.
- After changing how strings reach the build, compare the packaged strings with a baseline package:

    ```bash
    npm run verify-package-parity -- <baseline.pbiviz> <candidate.pbiviz>
    ```

    The tool compares each part by hash, so a key-order change alone shows `DIFF` on `locale.en-US`. Unzip both packages and compare the `stringResources` keys and values too, to tell reordering from loss.

## Related Issues

- [Sharing UI, strings and wiring between both visuals through powerbi-host](../architecture-patterns/share-between-visuals-through-powerbi-host-2026-11-06.md): where each kind of shared string lives.
- [Webpack persistent cache ghost export warnings](./webpack-persistent-cache-ghost-export-warnings-2026-05-27.md): another webpack build gotcha in this repo.
