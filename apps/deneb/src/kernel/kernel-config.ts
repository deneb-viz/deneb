import type { ComponentType } from 'react';
import powerbi from 'powerbi-visuals-api';
import { type Translations } from '@deneb-viz/app-core';
import type { HostSettingsModel } from '../lib/persistence';
import type { HostFeatureFlags } from '../lib/dataset/types';
import type { SliceSyncDefinition } from '../lib/state/sync-types';

/**
 * Props rendered onto `config.App` by {@link VisualKernel}. Host plus the
 * four rendering-lifecycle adapters built once in the kernel's constructor
 * (see the wiring in `visual-kernel.ts`). App-core / vega-embed call these
 * without arguments (or with an `Error` for the error variant); the
 * adapters route to the coordinator's `*PendingRender` methods. No
 * `visualUpdateOptions` capture is needed here — the pending-render
 * binding is performed synchronously in the kernel's dispatch handlers
 * BEFORE `update()` returns, so by the time these async callbacks fire the
 * coordinator already knows which id they target.
 */
export type VisualAppProps = {
    host: powerbi.extensibility.visual.IVisualHost;
    onRenderingStarted: () => void;
    onRenderingFinished: () => void;
    /**
     * Settle-timer close (H2). DISTINCT from {@link VisualAppProps.onRenderingFinished}:
     * this adapter routes to the coordinator's deferring
     * `closePendingRenderSettle`, so if the settle timer fires while a
     * Vega render is still in flight it NO-OPS (the real embed close or
     * the safety-net owns the terminal) instead of emitting
     * `renderingFinished` mid-render. Used ONLY by the app's settle timer
     * — never by the embed path, which keeps the terminal
     * `onRenderingFinished`.
     */
    onSettleClose: () => void;
    onRenderingError: (error: Error) => void;
};

/**
 * Configuration an app supplies to {@link VisualKernel}'s constructor.
 * Nothing beyond this list: dev toggles are env reads, host services are
 * bound by the kernel itself.
 */
export type VisualKernelConfig = {
    /** Model class `VisualFormattingSettingsService.bind` populates. */
    settingsModel: new () => HostSettingsModel;
    /** The app's root component, mounted with {@link VisualAppProps}. */
    App: ComponentType<VisualAppProps>;
    /**
     * The app's translation extension. Merged after the kernel's own
     * strings, so app keys override kernel keys if both define one.
     */
    translations?: Translations;
    /** Feature flags threaded into dataset processing. */
    featureFlags: HostFeatureFlags;
    /** App-contributed slice-sync definitions, registered after the generic ones. */
    syncSlices?: SliceSyncDefinition[];
    /**
     * Optional hook run as the first statement inside the kernel
     * constructor's try block — before any store is read. This is where
     * an app installs its own store state (e.g. the retained editor's
     * singleton) so a throw here still degrades to the sanctioned
     * construction-failure text.
     */
    installState?: () => void;
};
