import {
    type SpecProvider,
    type SpecRenderMode
} from '@deneb-viz/vega-runtime/embed';
import { type UsermetaInteractivity } from '@deneb-viz/template-usermeta';
import type { SupportFieldConfiguration } from '@deneb-viz/data-core/support-fields';

export type DenebProject = {
    config: string;
    interactivity?: UsermetaInteractivity;
    logLevel: number;
    provider: SpecProvider | undefined;
    providerVersion: string | undefined;
    renderMode: SpecRenderMode;
    spec: string;
    supportFieldConfiguration: SupportFieldConfiguration;
};
