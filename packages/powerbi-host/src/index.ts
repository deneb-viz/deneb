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

// Visual store: hook.
export { useDenebVisualState } from './state';

// Power BI interactivity: the manager and its constants.
export {
    InteractivityManager,
    CROSS_FILTER_LIMITS,
    isCrossFilterPropSet
} from './lib/interactivity';

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

// Strings: the format pane strings a visual's settings pane shows too.
export { SETTINGS_PANE_TRANSLATIONS } from './i18n/settings-pane';

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
// Landing pages: each visual composes its own page from these, with its own
// branding, cards and links.
export { LandingPageLayout } from './features/status/components/landing-page-layout';
export {
    LandingPageCard,
    type LandingPageStep
} from './features/status/components/landing-page-card';
export {
    LandingPageLinks,
    type LandingPageLink
} from './features/status/components/landing-page-links';

// Toast notifications: the toaster with the ones every visual shows, and the
// pieces a visual builds its own from.
export {
    NotificationToaster,
    NotificationToast,
    TOAST_NOTIFICATION_TIMEOUT,
    type NotificationProps
} from './features/toaster';

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
export type { VisualKernelConfig, VisualAppProps } from './app/kernel-config';

// What every visual's `App` composes: the Power BI platform provider, the
// rendering lifecycle's settle close, and the dev overlays.
export { usePlatformProvider } from './app/use-platform-provider';
export { useRenderingSettle } from './app/use-rendering-settle';
export { DevOverlays } from './app/dev-overlays';
export type { HostFeatureFlags } from './lib/dataset/types';
