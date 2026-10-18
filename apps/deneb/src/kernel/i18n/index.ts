import { type Translations } from '@deneb-viz/app-core';
import { en_US } from './en-US';

/**
 * The kernel's own translation extension. Registered first in
 * {@link VisualKernel}'s locale setup, followed by the config's
 * `translations` when provided — so app keys override kernel keys if both
 * define one.
 */
export const KERNEL_I18N_TRANSLATIONS: Translations = {
    'en-US': en_US
};
