# CLAUDE.md

This file provides quick-reference guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **For detailed information**, see [doc/DEVELOPMENT.md](doc/DEVELOPMENT.md) - the comprehensive development guide.

## Project Overview

Deneb is a custom Power BI visual that enables declarative visualization using Vega and Vega-Lite languages. It's an npm workspaces monorepo using Turbo for orchestration and a custom Webpack 5 build system.

**Key Technologies:** React 19, Vega 6.2, Vega-Lite 6.4, Monaco Editor, Fluent UI, Zustand, TypeScript 5.6, Webpack 5, Power BI Visuals API 5.11

## Common Commands

### Development

```bash
npm run dev                          # Start all package watchers + webpack dev server (https://localhost:8080)
npm run webpack:build                # One-off dev build without server
```

### Testing & Linting

```bash
npm run test                         # Run all tests across packages (Vitest)
npm run test:watch                   # Watch mode for tests
npm run eslint                       # Lint all packages + root
npm run prettier-check               # Check code formatting
npm run prettier-format              # Auto-format code
```

### Production Packaging

```bash
npm run package                      # Certified build for AppSource (validates config first)
npm run package-standalone           # Developer build with external URIs enabled
npm run package-alpha                # Alpha channel build
npm run package-beta                 # Beta channel build
npm run webpack:analyze              # Generate bundle size analysis (webpack.statistics.html)
```

### Utilities

```bash
npm run validate-config-for-commit   # Validate .env flags for certification (critical before packaging)
npm run clean                        # Clean all build artifacts
npm run sync-packages                # Sync package versions across monorepo
```

### First-Time Setup

```bash
npm install       # Install dependencies
npm run dev       # Start development (auto-primes assets if needed)
```

> **Details**: See [First-time setup](doc/DEVELOPMENT.md#first-time-setup) in DEVELOPMENT.md

## High-Level Architecture

### Monorepo Structure

**Root Package (`@deneb-viz/deneb`):** Main Power BI custom visual

- Entry: [src/index.ts](src/index.ts) exports `Deneb` class implementing `IVisual`
- Visual GUID: `deneb7E15AEF80B9E4D4F8E12924291ECE89A`
- Integrates all workspace packages into final `.pbiviz` bundle

**Workspace Packages (`packages/`):**

- **app-core** - Core UI application (React components, Monaco editor, state management)
- **vega-runtime** - Vega/Vega-Lite runtime integration, spec processing, and compilation
- **vega-react** - React hooks and context for Vega embedding (useVegaEmbed, VegaViewProvider)
- **powerbi-compat** - Power BI API compatibility layer (**SINGLETON** - see below)
- **data-core** - Dataset field management and value processing
- **json-processing** - JSON spec processing and field tracking
- **configuration** - Configuration and feature flags
- **template-usermeta** - Template metadata handling
- **utils** - Shared utilities (logging, crypto, etc.)
- **eslint-config**, **typescript-config** - Shared tooling configs

**Apps (`apps/`):**

- **web-client-sample** - Vite-based web integration sample

### Critical: Singleton Package Pattern

`@deneb-viz/powerbi-compat` MUST remain a singleton to maintain shared runtime state:

- Packages consuming it declare it as `peerDependency` (not `dependency`)
- Mark as `external` in tsup configs to prevent bundling
- Root visual provides the single runtime instance
- Uses TypeScript compiler (tsc) instead of tsup to inline const enums from `powerbi-visuals-api`

**When adding dependencies on `@deneb-viz/powerbi-compat`:**

1. Add to `peerDependencies` in consuming package's package.json
2. Add to `external` array in consuming package's tsup.config.ts
3. Never bundle it - let the root visual provide the singleton instance

### Compilation Architecture

The spec compilation flow in `@deneb-viz/vega-runtime` and `@deneb-viz/app-core`:

```
User Spec (JSONC) → parseSpec() → Signal migration (pbiContainer→denebContainer)
    ↓
Parsed spec → patchVegaSpec/patchVegaLiteSpec → Config patching
    ↓
Compiled template (reusable) → patchSpecWithData() → Final spec with dataset
    ↓
buildEmbedOptions() → useVegaEmbed() → vegaEmbed() → Vega View
```

**Key modules:**
- `vega-runtime/spec-processing` - Parsing, patching, validation
- `vega-runtime/compilation` - Orchestrates spec compilation
- `vega-react/hooks` - useVegaEmbed, useVegaView for React integration
- `app-core/state/compilation` - Zustand slice for compilation state

**Legacy signal migration:** Specs using `pbiContainerWidth`/`pbiContainerHeight` are automatically migrated to `denebContainer.width`/`denebContainer.height` with deprecation warnings.

### Data Flow

```
Power BI DataView → update() → Categorical data extraction → Dataset mapping
    ↓
Dataset passed to Vega view (via compilation API)
    ↓
Vega signals → Visual state (Zustand) → Power BI host (selections/cross-filters)
    ↓
React UI (Fluent UI components) + Vega canvas rendering
```

### State Management

**Visual State ([src/state/state.ts](src/state/state.ts)):** Zustand-based with slices

- `dataset` - Data and field state
- `host` - Power BI host integration
- `interactivity` - Selection/filtering state
- `interface` - UI state
- `settings` - Visual settings/properties
- `updates` - Visual update tracking

**App-Core State:** Separate store in `@deneb-viz/app-core` for reusable components

### Build System Architecture

**Webpack 5 Custom Toolchain:**

- [webpack.common.config.js](webpack.common.config.js) - Shared base config
- [webpack.dev.config.js](webpack.dev.config.js) - Dev mode (optimized for speed)
- [webpack.prod.config.js](webpack.prod.config.js) - Production (optimized for certification)

**Key Points:**

- TypeScript inlines const enums at compile time (no runtime dependency on powerbi-visuals-api)
- Dev: No source maps, incremental compilation, certification fix disabled → **~22s initial, ~1-2s rebuilds**
- Production: No source maps (not included in .pbiviz), certification fix enabled, type checking
- Turbo orchestrates package builds with dependency awareness

> **Details**: See [Webpack Architecture](doc/DEVELOPMENT.md#4-webpack-architecture) and [WEBPACK-OPTIMIZATIONS.md](doc/WEBPACK-OPTIMIZATIONS.md)

### Power BI Visual Integration

**Constructor ([src/index.ts](src/index.ts)):**

- Binds VisualHostServices singleton
- Initializes InteractivityManager
- Sets up Zustand stores
- Configures i18n with host locale
- Binds Vega extensibility services

**Update Method:**

- Handles dataView changes (categorical data processing)
- Manages dataset mapping and field tracking
- Triggers Vega view updates
- Handles cross-filtering and interactivity

**Visual Host Services:**

- Centralized access to Power BI host capabilities
- Selection, tooltip, theme integration, locale/formatting

## Feature Flags & Environment Configuration

**Feature Flags**: JSON-based in [config/features.json](config/features.json), imported via `FEATURES` from `config/index.ts`

**Environment Variables** (.env - local only, NOT committed):
- `LOG_LEVEL` - 0 (None) to 51 (Timing)
- `ALLOW_EXTERNAL_URI` - false (certified) / true (standalone only)
- `ZUSTAND_DEV_TOOLS`, `PBIVIZ_DEV_MODE`, `PBIVIZ_DEV_OVERLAY` - dev toggles

**CRITICAL:** Run `npm run validate-config-for-commit` before packaging to ensure certification-safe values.

> **Details**: See [Feature Flags](doc/DEVELOPMENT.md#6-feature-flags) and [Logging](doc/DEVELOPMENT.md#7-logging--diagnostics) in DEVELOPMENT.md

## Packaging Modes

| Mode       | Command                      | certificationFix | External URIs |
| ---------- | ---------------------------- | ---------------- | ------------- |
| Certified  | `npm run package`            | ✓                | ✗             |
| Alpha      | `npm run package-alpha`      | ✓                | ✗             |
| Beta       | `npm run package-beta`       | ✓                | ✗             |
| Standalone | `npm run package-standalone` | ✗                | ✓             |

> **Details**: See [Production Packaging](doc/DEVELOPMENT.md#8-production-packaging) in DEVELOPMENT.md

## Development Workflow

**Quick Start:**
1. `npm run dev` → auto-primes assets, starts watchers + dev server
2. Open Power BI pointing to `https://localhost:8080/assets/visual.js`
3. Edit code → webpack auto-rebuilds (~1-2s) → page reloads

**Package Build Order**: Config → Utils/Data-core/PowerBI-compat → Vega-runtime/JSON-processing → Vega-react → App-core → Root visual

> **Details**: See [Local Development Workflow](doc/DEVELOPMENT.md#2-local-development-workflow) in DEVELOPMENT.md

## Important Constraints

**Bundle Size:** ~1MB max (Power BI limit) - use `npm run webpack:analyze` to inspect

**TypeScript Const Enums:** `powerbi-visuals-api` enums are inlined at compile time (no runtime dependency)
- Root visual: ts-loader with `transpileOnly=false` in production
- `@deneb-viz/powerbi-compat`: uses tsc (not tsup) to preserve inlining

**Certification:** Validate with `npm run validate-config-for-commit` before packaging
- `ALLOW_EXTERNAL_URI=false`, `LOG_LEVEL=0`, all dev toggles off

## Troubleshooting

Common issues:
- **Constructor not firing** → Check `_DEBUG` suffix in webpack.common.config.js
- **Slow rebuilds (>5s)** → Ensure `certificationFix: false` in dev mode
- **Visual doesn't load** → Clear `.tmp/`, restart `npm run dev` (auto-primes)
- **Type errors unnoticed** → Run `npm run webpack:package` or `npx tsc --noEmit`

## Known Workarounds

### Vega-Embed Actions Bug

vega-embed has a bug where `actions: false` doesn't prevent the `.has-actions` class from being applied, causing unwanted padding. The workaround requires spreading `actions: false` directly at the `vegaEmbed()` call site in `vega-react/src/hooks/use-vega-embed.ts`:

```typescript
vegaEmbed(ref.current, spec, { ...options, actions: false })
```

This is combined with CSS safety in `app-core/vega-embed.tsx`:
```typescript
'& .vega-actions': { display: 'none !important' },
paddingRight: '0 !important'
```

Both layers are necessary - upstream configuration alone doesn't work due to vega-embed's internal option processing.

> **Full troubleshooting guide**: [DEVELOPMENT.md#10-troubleshooting--known-issues](doc/DEVELOPMENT.md#10-troubleshooting--known-issues)

## Additional Resources

- **Main Documentation:** https://deneb-viz.github.io/
- **Development Guide:** [doc/DEVELOPMENT.md](doc/DEVELOPMENT.md) (comprehensive webpack migration notes, troubleshooting)
- **Repository:** https://github.com/deneb-viz/deneb
