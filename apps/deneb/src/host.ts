/**
 * Transitional host barrel.
 *
 * This module is the SOLE import surface app-side code (`src/app/**`,
 * `src/i18n/**`, `src/features/settings/**`, `src/features/toaster/**`,
 * `src/index.ts`, and the landing-page components and index under
 * `src/features/status`) is permitted to use for reaching kernel-side code
 * (`src/kernel/**`, `src/lib/**`, `src/state/**`, the dev-overlay features,
 * and the generic status components). App-side files must import kernel
 * modules through `'./host'` / `'../host'` / etc. rather than by relative
 * path into a kernel-side folder; `host-barrel-boundary.test.ts` enforces
 * this.
 *
 * Kernel-side modules must never import this barrel. It is the kernel's
 * public entry as seen from the app side, so a kernel-side module that
 * imported it would create a circular initialisation: the entry would
 * import (transitively) back into itself, and any helper invoked at
 * module-init time along that path would run before its own definition.
 */

// Visual store: hook and getter.
export { useDenebVisualState, getDenebVisualState } from './state';

// Power BI interactivity: the manager, its constants/types, and the
// context-menu, cross-filter and tooltip event handlers.
export {
    InteractivityManager,
    contextMenuHandler,
    crossFilterHandler,
    tooltipHandler,
    CROSS_FILTER_LIMITS,
    isCrossFilterPropSet
} from './lib/interactivity';
export type * from './lib/interactivity';

// Persistence: property read/write, template-create persistence, and the
// property-change type.
export {
    persistOnCreateFromTemplate,
    persistProperties,
    resolveObjectProperties,
    HostSettingsModel,
    DEFAULTS,
    type PersistenceProperty
} from './lib/persistence';

// Vega embed: the Power BI-aware Vega loader.
export { getVegaLoader } from './lib/vega-embed';

// Power BI host: export-permission resolution.
export { resolveDownloadPermitted } from './lib/host';

// Generic status pages: the pieces every status page composes, plus the
// shared style hook. The four landing-page components stay app-side (see
// `src/features/status/index.ts`) and import these from here.
export { FetchingMessage } from './features/status/components/fetching-message';
export { SplashInitial } from './features/status/components/splash-initial';
export { Progress } from './features/status/components/progress';
export { StatusContainer } from './features/status/components/status-container';
export { StatusStackItem } from './features/status/components/status-stack-item';
export { useStatusStyles } from './features/status/components/index';

// Dev overlays: both features export a same-named `IS_OVERLAY_ENABLED`
// today, so each is re-exported here under a feature-specific name to
// avoid a collision in this barrel's namespace.
export {
    IS_OVERLAY_ENABLED as IS_VIEWPORT_GATE_OVERLAY_ENABLED,
    ViewportGateDebugOverlay
} from './features/viewport-gate-debug-overlay';
export {
    IS_OVERLAY_ENABLED as IS_VISUAL_UPDATE_HISTORY_OVERLAY_ENABLED,
    VisualUpdateHistoryOverlay
} from './features/visual-update-history-overlay';

// Application metadata, sourced from pbiviz.json.
export {
    APPLICATION_NAME,
    APPLICATION_DESCRIPTION,
    APPLICATION_VERSION
} from './lib/application';

// Slice-sync configuration types, for apps contributing their own
// synchronized slices (see `app/editor-preferences-sync.ts`).
export type {
    SliceSyncMapping,
    SliceSyncConfig,
    SliceSyncDefinition
} from './lib/state/sync-types';
export { defineSliceSync } from './lib/state/sync-types';

// The kernel base class and the types an app supplies to it.
export { VisualKernel } from './kernel/visual-kernel';
export type {
    VisualKernelConfig,
    VisualAppProps
} from './kernel/kernel-config';
export type { HostFeatureFlags } from './lib/dataset/types';
