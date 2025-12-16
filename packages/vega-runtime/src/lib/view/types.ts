import {
    type CrossFilterTranslate,
    type InteractivityLookupDataset
} from '@deneb-viz/powerbi-compat/interactivity';
import { type SelectionMode } from '@deneb-viz/template-usermeta';

export type HandleNewViewOptions = {
    dataset: InteractivityLookupDataset;
    logLevel: number;
    selectionMode: SelectionMode;
    generateRenderId: () => void;
    translate: CrossFilterTranslate;
    logError: (error: string) => void;
    logWarn: (warning: string) => void;
};

export type HandleViewErrorOptions = {
    generateRenderId: () => void;
    logError: (error: string) => void;
};
