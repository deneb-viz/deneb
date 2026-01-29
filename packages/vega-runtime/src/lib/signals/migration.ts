import {
    SIGNAL_DENEB_CONTAINER,
    SIGNAL_PBI_CONTAINER_LEGACY,
    getContainerSignalReferences
} from './deneb-container';

/**
 * Legacy standalone signals from Deneb versions < 2.0.
 * These were separate signals, not properties of pbiContainer.
 * @deprecated These are migrated to denebContainer.width and denebContainer.height
 */
const SIGNAL_PBI_CONTAINER_WIDTH_LEGACY = 'pbiContainerWidth';
const SIGNAL_PBI_CONTAINER_HEIGHT_LEGACY = 'pbiContainerHeight';

/**
 * Result of signal migration analysis and replacement.
 */
export interface SignalMigrationResult {
    /** The spec text with legacy signal references replaced */
    spec: string;
    /** Whether any legacy signal references were found and replaced */
    hadLegacyReferences: boolean;
    /** Count of replacements made */
    replacementCount: number;
}

/**
 * Replace all occurrences of legacy signals with their modern equivalents.
 *
 * **Legacy signal migrations:**
 * - `pbiContainer` → `denebContainer`
 * - `pbiContainerWidth` → `denebContainer.width`
 * - `pbiContainerHeight` → `denebContainer.height`
 *
 * This migration is automatic and backward-compatible. Specs using legacy signal names will
 * continue to work, but developers should update to use the modern names.
 *
 * @param specText The specification text (JSON as string)
 * @returns Migration result with updated spec and metadata about changes
 *
 * @example
 * ```typescript
 * const result = replaceLegacySignalReferences(userSpec);
 * if (result.hadLegacyReferences) {
 *   console.warn('Legacy signals detected. Please update to denebContainer.');
 * }
 * // Use result.spec for further processing
 * ```
 */
export const replaceLegacySignalReferences = (
    specText: string
): SignalMigrationResult => {
    const containerRefs = getContainerSignalReferences();
    let migratedSpec = specText;
    let totalReplacementCount = 0;

    // Migration 1: pbiContainerWidth → denebContainer.width
    const widthPattern = new RegExp(
        `\\b${SIGNAL_PBI_CONTAINER_WIDTH_LEGACY}\\b`,
        'g'
    );
    const widthMatches = migratedSpec.match(widthPattern);
    if (widthMatches) {
        totalReplacementCount += widthMatches.length;
        migratedSpec = migratedSpec.replace(widthPattern, containerRefs.width);
    }

    // Migration 2: pbiContainerHeight → denebContainer.height
    const heightPattern = new RegExp(
        `\\b${SIGNAL_PBI_CONTAINER_HEIGHT_LEGACY}\\b`,
        'g'
    );
    const heightMatches = migratedSpec.match(heightPattern);
    if (heightMatches) {
        totalReplacementCount += heightMatches.length;
        migratedSpec = migratedSpec.replace(heightPattern, containerRefs.height);
    }

    // Migration 3: pbiContainer → denebContainer (the main signal object)
    const containerPattern = new RegExp(
        `\\b${SIGNAL_PBI_CONTAINER_LEGACY}\\b`,
        'g'
    );
    const containerMatches = migratedSpec.match(containerPattern);
    if (containerMatches) {
        totalReplacementCount += containerMatches.length;
        migratedSpec = migratedSpec.replace(
            containerPattern,
            SIGNAL_DENEB_CONTAINER
        );
    }

    return {
        spec: migratedSpec,
        hadLegacyReferences: totalReplacementCount > 0,
        replacementCount: totalReplacementCount
    };
};

/**
 * Log a deprecation warning when legacy signal references are detected.
 * Should be called once per parsing session when migration occurs.
 *
 * @param replacementCount Number of replacements made
 */
export const logLegacySignalWarning = (replacementCount: number) => {
    console.warn(
        `[Deneb Migration] Deprecated signal 'pbiContainer' detected (${replacementCount} reference${replacementCount === 1 ? '' : 's'}). ` +
            `This has been automatically replaced with 'denebContainer'. ` +
            `Please update your specification to use 'denebContainer' instead. ` +
            `The legacy signal name will be removed in a future version.`
    );
};

/**
 * Check if a spec contains legacy signal references without performing replacement.
 * Checks for all legacy signal names: pbiContainer, pbiContainerWidth, pbiContainerHeight.
 *
 * @param specText The specification text to check
 * @returns True if any legacy references are found
 */
export const hasLegacySignalReferences = (specText: string): boolean => {
    const legacyPatterns = [
        new RegExp(`\\b${SIGNAL_PBI_CONTAINER_LEGACY}\\b`),
        new RegExp(`\\b${SIGNAL_PBI_CONTAINER_WIDTH_LEGACY}\\b`),
        new RegExp(`\\b${SIGNAL_PBI_CONTAINER_HEIGHT_LEGACY}\\b`)
    ];
    return legacyPatterns.some((pattern) => pattern.test(specText));
};
