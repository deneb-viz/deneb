import {
    type CrossFilterTranslate,
    type InteractivityLookupDataset
} from '@deneb-viz/powerbi-compat/interactivity';
import { SelectionMode } from '@deneb-viz/template-usermeta';

/**
 * Options provided when updating extensibility services. This allows advanced corss-filtering to work with the latest
 * information from the visual host and state.
 */
export type ExtensibilityServicesUpdateOptions = {
    dataset: InteractivityLookupDataset;
    selectionMode: SelectionMode;
    logWarn: (warning: string) => void;
    translate: CrossFilterTranslate;
};
