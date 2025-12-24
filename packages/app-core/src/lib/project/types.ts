import {
    type SpecProvider,
    type SpecRenderMode
} from '@deneb-viz/vega-runtime/embed';

export type DenebProject = {
    config: string;
    logLevel: number;
    provider: SpecProvider | undefined;
    providerVersion: string | undefined;
    renderMode: SpecRenderMode;
    spec: string;
};
