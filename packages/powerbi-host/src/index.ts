/**
 * Entry of `@deneb-viz/powerbi-host`: the Power BI host kernel.
 *
 * This module is the SOLE import surface visuals use to reach the kernel;
 * the package exports only `.`, so consumers cannot import deep paths.
 * The kernel itself (`app/`, `features/`, `components/`, `lib/`, `state/`,
 * `i18n/`) never imports this entry: doing so would create a circular
 * initialisation, since the entry imports (transitively) back into itself
 * and any helper invoked at module-init time along that path would run
 * before its own definition.
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
    VisualFormattingSettingsService,
    getVisualFormattingModel,
    DEFAULTS,
    type PersistenceProperty
} from './lib/persistence';

// Vega embed: the Power BI-aware Vega loader.
export { getVegaLoader } from './lib/vega-embed';

// Power BI host: export-permission resolution.
export { resolveDownloadPermitted } from './lib/host';

// Generic status pages: the pieces every status page composes, plus the
// shared style hook.
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

// Slice-sync configuration types, for apps contributing their own
// synchronized slices (see `app/editor-preferences-sync.ts`).
export type {
    SliceSyncMapping,
    SliceSyncConfig,
    SliceSyncDefinition
} from './lib/state/sync-types';
export { defineSliceSync } from './lib/state/sync-types';

// The kernel base class and the types an app supplies to it.
export { VisualKernel } from './app/visual-kernel';
export { KERNEL_I18N_TRANSLATIONS } from './i18n';
export type { VisualKernelConfig, VisualAppProps } from './app/kernel-config';
export type { HostFeatureFlags } from './lib/dataset/types';
