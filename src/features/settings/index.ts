import { VisualFormattingSettingsModel } from '@deneb-viz/powerbi-compat/properties';

export { InteractivitySettings } from './components/interactivity-settings';

/**
 * Represents an enum member from capabilities.json
 */
export interface ICapabilitiesEnumMember {
    value: string;
    displayName: string;
    displayNameKey?: string;
}

/**
 * When a visual updates from the host, we don't always need to update things
 * like settings or data, if the update type is non-volatile, i.e. there's no
 * change to the data.
 *
 * Some settings may not inherently change the data view, but should signal
 * that we should re-process it. These are when:
 *
 * - Cross-filtering is enabled/disabled (we need to add/remove the field that
 *      tracks selection state)
 * - Cross-highlighting (we need to swap out highlight values for originals
 *      within the Deneb dataset)
 * - Data limit override (we may have had a segment in the metadata indicating
 *      there were more rows ot load, but we previously opted to ignore it)
 */
export const isSettingsChangeVolatile = (
    previous: VisualFormattingSettingsModel,
    current: VisualFormattingSettingsModel
) => {
    if (!previous) return false;
    const selectionStatusChanged =
        previous?.vega?.interactivity?.enableSelection?.value !==
        current?.vega?.interactivity?.enableSelection?.value;
    const selectionModeChanged =
        previous?.vega?.interactivity?.selectionMode?.value !==
        current?.vega?.interactivity?.selectionMode?.value;
    const highlightStatusChanged =
        previous?.vega?.interactivity?.enableHighlight?.value !==
        current?.vega?.interactivity?.enableHighlight?.value;
    const localeChanged =
        previous?.developer?.localization?.locale?.value !==
        current?.developer?.localization?.locale?.value;
    // If we implement configurable window size (API 5.2) this will be needed.
    // const dataWindowStatusChanged =
    //     previous?.dataReductionCustomization?.categoryCount !==
    //     current?.dataReductionCustomization?.categoryCount;
    const dataLimitStatusChanged =
        previous?.dataLimit?.loading?.override?.value !==
        current?.dataLimit?.loading?.override?.value;
    return (
        selectionStatusChanged ||
        selectionModeChanged ||
        highlightStatusChanged ||
        localeChanged ||
        // If we implement configurable window size (API 5.2) this will be needed.
        // dataWindowStatusChanged ||
        dataLimitStatusChanged ||
        false
    );
};
