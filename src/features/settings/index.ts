import VisualSettings from '../../properties/visual-settings';

export { SettingsPane } from './components/settings-pane';
export { VisualSettings };

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
    previous: VisualSettings,
    current: VisualSettings
) => {
    if (!previous) return false;
    const selectionStatusChanged =
        previous?.vega?.enableSelection !== current?.vega?.enableSelection;
    const selectionModeChanged =
        previous?.vega?.selectionMode !== current?.vega?.selectionMode;
    const highlightStatusChanged =
        previous?.vega?.enableHighlight !== current?.vega?.enableHighlight;
    const localeChanged =
        previous?.developer?.locale !== current?.developer?.locale;
    // If we implement configurable window size (API 5.2) this will be needed.
    // const dataWindowStatusChanged =
    //     previous?.dataReductionCustomization?.categoryCount !==
    //     current?.dataReductionCustomization?.categoryCount;
    const dataLimitStatusChanged =
        previous?.dataLimit?.override !== current?.dataLimit?.override;
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
