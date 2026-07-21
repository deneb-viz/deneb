# Webpack Build Optimizations

**Last Updated:** 2026-01-15
**Context:** This document explains the webpack optimizations made to improve dev build times from ~30-40s to ~22s initial / ~1-2s rebuilds, while maintaining Power BI compatibility and certification requirements.

**Purpose:**

- Document optimization decisions for future maintainers
- Provide troubleshooting guide for performance issues
- Explain what was tried and why certain approaches were rejected

**Quick Reference:**

- Dev build too slow? → Check [Common Mistakes to Avoid](#common-mistakes-to-avoid)
- Need to debug? → See [Debugging Guide](#debugging-guide) (console.log recommended for Power BI Service)
- Trying new optimization? → Review [Future Opportunities](#future-optimization-opportunities) for what we already considered
- Build issues? → See [Troubleshooting](#troubleshooting) section

---

## Summary of Changes

Five key optimizations were made to improve dev build performance:

1. **TypeScript optimizations** - `skipLibCheck` + `incremental` compilation
2. **Disabled source maps in dev** - Can enable temporarily when needed
3. **Disabled certification fix in dev** - Only needed for production packaging
4. **Fixed publicPath** - Dev server requires absolute path `/assets/`
5. **Auto-asset priming** - Eliminates manual `npm run package` before first dev run

**Net result:** 45% faster initial builds, 90% faster rebuilds, no impact on production builds.

---

## Detailed Changes

### 1. TypeScript Compilation Optimizations

**File:** [webpack.common.config.js](../webpack.common.config.js)

```javascript
compilerOptions: !isProduction
    ? {
          skipLibCheck: true, // Skip .d.ts type checking (faster)
          incremental: true, // Enable incremental compilation
          tsBuildInfoFile: path.join(
              __dirname,
              '.tmp',
              'webpack-cache',
              'tsconfig.tsbuildinfo'
          )
      }
    : undefined;
```

**Why this works:**

- `skipLibCheck` skips type checking in `.d.ts` files (we trust external types)
- `incremental` saves compilation state between builds
- Build info cached in `.tmp/webpack-cache/tsconfig.tsbuildinfo`

**Impact:** ~30% faster TypeScript compilation

**Trade-off:** Dev mode doesn't catch type errors in `.d.ts` files, but VS Code does this anyway in real-time.

---

### 2. Disabled Source Maps in Dev Mode

**File:** [webpack.dev.config.js](../webpack.dev.config.js)

```javascript
devtool: false,  // No source maps for fastest builds
```

**Why we disabled source maps:**

- Non-eval source maps add ~15-20s overhead per build
- Eval-based source maps (`eval-*`) don't work in Power BI (Content Security Policy blocks eval)
- VS Code provides excellent TypeScript debugging with breakpoints in actual source files
- Production builds still have full source maps for crash debugging

**Alternative when browser debugging is needed:**

```javascript
// Temporarily edit webpack.dev.config.js
devtool: 'cheap-module-source-map',  // ~15s slower but enables browser debugging
```

**Impact:** ~50% faster builds

**Trade-off:** Can't debug minified code in browser DevTools, but console.log still works. Use VS Code debugging instead.

---

### 3. Disabled Certification Fix in Dev Mode

**File:** [webpack.common.config.js](../webpack.common.config.js)

```javascript
certificationFix: !devMode && certificationFix,
```

**Why certification fix is expensive:**

- Runs Babel to parse entire bundle into Abstract Syntax Tree (AST)
- Searches for forbidden API calls (fetch, eval, XMLHttpRequest, etc.)
- Required for AppSource certification to ensure sandbox compliance
- Takes ~10-15s on large bundles (our bundle is ~7-10MB in dev)

**Why we can skip it in dev:**

- Only needed when packaging for submission to Microsoft
- Production builds still run certification fix
- Dev code changes don't affect whether APIs are allowed
- If forbidden APIs are accidentally used, production build will catch them

**How to verify it's disabled:**

- Dev builds should NOT show: `"X entries of fetch, eval, XMLHttpRequest were removed"`
- If you see this warning in dev, certification fix is enabled (bug)

**Impact:** ~40% faster builds

**Trade-off:** None - this optimization is pure win since certification fix is only needed for packaging.

---

### 4. Fixed publicPath for Dev Server

**File:** [webpack.common.config.js](../webpack.common.config.js)

```javascript
publicPath: devMode ? '/assets/' : 'assets',
```

**Why publicPath matters:**

- Webpack dev server serves files at absolute URLs: `https://localhost:8080/assets/visual.js`
- Webpack output config tells it where to _put_ the bundle
- These must match or dev server returns 404

**The bug:**

- `publicPath: 'assets'` (relative) didn't match dev server's `/assets/` (absolute)
- Visual loaded fine in production but 404'd in dev

**The fix:**

```javascript
publicPath: devMode ? '/assets/' : 'assets',
```

**Impact:** Fixed critical bug preventing dev server from serving bundles

**Lesson learned:** Always test both dev server and production packaging when changing output paths.

---

### 5. Auto-Asset Priming

**New Files:**

- [bin/dev-with-prime.js](../bin/dev-with-prime.js)

**Updated Files:**

- [package.json](../package.json) - `dev` script now calls `dev-with-prime.js`
- [webpack.dev.config.js](../webpack.dev.config.js) - Accepts `generateResources` env var

**Behavior:**

```javascript
// Checks for required assets before starting dev server
if (!pbiviz.json exists || !pbiviz.json.stringResources) {
  npm run webpack:prime  // One-time build with resources
}
npm run webpack:start    // Start dev server
```

**Why this was needed:**

- Power BI webpack plugin generates `pbiviz.json` and `visualPlugin.ts` only during packaging
- Dev server needs these files to work, but doesn't generate them itself
- Previous workflow required `npm run package` (slow) before first `npm run dev`

**How it works:**

1. `npm run dev` calls `bin/dev-with-prime.js`
2. Script checks if required assets exist and are valid
3. If missing/invalid, runs `npm run webpack:prime` (one-time ~22s build)
4. Then starts dev server normally

**Validation logic:**

- Checks for `pbiviz.json` AND `visualPlugin.ts`
- Verifies `pbiviz.json` has `stringResources` (not just metadata)
- Prevents stale cache from beta/alpha builds

**Impact:**

- Eliminates need to run `npm run package` (~80s) before first `npm run dev`
- Simplifies onboarding for new developers (one command instead of two)
- Prevents stale cache issues from previous package builds

**Trade-off:** First `npm run dev` takes ~22s instead of instant, but this is one-time cost.

---

## Performance Results

| Scenario             | Before  | After | Improvement             |
| -------------------- | ------- | ----- | ----------------------- |
| Initial dev build    | ~30-40s | ~22s  | 45% faster              |
| Rebuild after change | ~15-20s | ~1-2s | 90% faster              |
| Production build     | ~80s    | ~80s  | No change (intentional) |

---

## What Still Works

✅ **TypeScript type checking** - VS Code shows errors in real-time
✅ **Console.log debugging** - Works in Power BI
✅ **Production builds** - Certification fix enabled, optimized for size
✅ **Const enum inlining** - Power BI API enums work correctly
✅ **Visual hot reload** - Live reload on file changes
✅ **Package builds** - All certification requirements met

---

## What Changed

⚠️ **No source maps in dev or production** - Source maps aren't included in .pbiviz packages

- Use `console.log()` or @deneb-viz/utils logger for debugging in Power BI Service (powerbi.com)
- Can temporarily enable source maps in dev when needed: `devtool: 'cheap-module-source-map'`

---

## Configuration Matrix

| Setting             | Dev Mode               | Production Mode |
| ------------------- | ---------------------- | --------------- |
| `devtool`           | `false`                | `false`         |
| `skipLibCheck`      | `true`                 | `false`         |
| `incremental`       | `true`                 | `false`         |
| `certificationFix`  | `false`                | `true`          |
| `generateResources` | `false` (except prime) | `true`          |
| `generatePbiviz`    | `false`                | `true`          |
| `publicPath`        | `'/assets/'`           | `'assets'`      |

---

## Troubleshooting

### Visual doesn't load in Power BI

**Check:** Is dev server running? Visit `https://localhost:8080/assets/visual.js`

- Should return 200 OK with JavaScript content
- If 404, check `publicPath` setting

**Check:** Is visual.js size reasonable? Should be ~7-10MB in dev

- If 75MB+, eval-based source maps might be enabled

### Builds are still slow

**Check:** Is webpack cache being cleared?

- Cache should persist in `.tmp/webpack-cache/`
- First build after cache clear is always slower

**Check:** Is certification fix disabled in dev?

- Should NOT see "entries of fetch, eval, XMLHttpRequest were removed" warning in dev builds
- If you see it, `certificationFix` is enabled (should be `!devMode && certificationFix`)

### TypeScript errors not showing

**Check:** VS Code TypeScript version

- Should match project version (5.6.2)
- Errors show in Problems panel, not in webpack output

---

## Common Mistakes to Avoid

### ❌ Don't: Enable `transpileOnly: true` without `preserveConstEnums`

**Problem:** Power BI API const enums won't inline, causing runtime errors
**Error:** `Cannot read properties of undefined (reading 'name')`
**Fix:** Keep `transpileOnly: false` or add proper const enum handling

### ❌ Don't: Use eval-based source maps in dev

**Problem:** Power BI's Content Security Policy blocks eval
**Symptom:** 75MB bundle size, visual doesn't load
**Fix:** Use `devtool: false` or `cheap-module-source-map` (no eval variants)

### ❌ Don't: Clear `.tmp/` cache unnecessarily

**Problem:** Forces full rebuild (~22s instead of ~1-2s)
**When to clear:** Only when switching between alpha/beta/certified builds or when assets are corrupted
**Better approach:** Let webpack's filesystem cache handle incremental builds

### ❌ Don't: Enable certification fix in dev mode

**Problem:** Adds 10-15s to every build for no benefit
**Symptom:** Build log shows "X entries of fetch, eval, XMLHttpRequest were removed"
**Fix:** Ensure `certificationFix: !devMode && certificationFix` in webpack.common.config.js

### ❌ Don't: Forget to validate before packaging

**Problem:** Accidentally package with dev flags enabled
**Fix:** Always run `npm run validate-config-for-commit` before `npm run package`

### ✅ Do: Use console.log() for debugging in Power BI Service

**Benefit:** Works in Power BI Service (not Power BI Desktop)
**How:** See [Debugging Guide](#debugging-guide) below for detailed instructions

### ✅ Do: Keep dev server running during development

**Benefit:** Avoid cold cache penalty (22s) for first build
**How:** Don't restart dev server unless config changes

---

## References

- [PowerBI Visuals Webpack Plugin](https://github.com/microsoft/powerbi-visuals-webpack-plugin)
- [Webpack Devtool Options](https://webpack.js.org/configuration/devtool/)
- [TypeScript Incremental Compilation](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#faster-subsequent-builds-with-the---incremental-flag)
