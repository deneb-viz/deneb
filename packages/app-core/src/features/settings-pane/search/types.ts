/**
 * Contracts for the settings-pane search module.
 *
 * The match engine operates on pre-translated, frozen descriptors — no
 * `translate` closure, no locale awareness inside the engine. Callers
 * resolve every label / assistive / heading key into strings before
 * invoking `buildMatchView`.
 */

/**
 * Stable identifiers for top-level settings-pane sections.
 *
 * Kept as an open `string` because platform contributors may register any
 * number of sibling sections (one per injected accordion item), each with
 * its own arbitrary id. The engine treats all ids opaquely; only the
 * dataset section has any special behaviour, and it's distinguished via
 * the separate `ResolvedDatasetDescriptor` shape, not the `SectionId` union.
 */
export type SectionId = string;

/** A character range inside a string, as `[start, end)`. */
export type HighlightRange = {
    start: number;
    end: number;
};

/** Per-surface highlight ranges attached to a visible row. */
export type RowHighlights = {
    label?: HighlightRange[];
    assistive?: HighlightRange[];
};

/**
 * Resolved descriptor for a single row (setting) inside a flat section.
 *
 * Searchable surfaces are pre-lowered at resolve time so the match engine
 * can compare against `*Lower` fields directly (single fold per string per
 * resolve, instead of re-folding on every keystroke). Display surfaces
 * (`label`, `assistive`) keep original case — consumers doing substring
 * matching MUST compare against the `*Lower` fields; the originals are for
 * rendering and for range-offset accuracy (offsets computed on the lowered
 * string are valid against the original because `toLowerCase()` is
 * length-preserving for the BMP locales we support).
 */
export type ResolvedRowDescriptor = {
    id: string;
    label: string;
    labelLower: string;
    assistive: string | null;
    assistiveLower: string | null;
};

/**
 * Resolved descriptor for a flat (non-Dataset) section.
 *
 * See {@link ResolvedRowDescriptor} note on `*Lower` semantics — the engine
 * compares against `headingLower`, not `heading`.
 */
export type ResolvedSectionDescriptor = {
    id: string;
    heading: string;
    headingLower: string;
    rows: ResolvedRowDescriptor[];
};

/**
 * A single applicable flag on a dataset field, with resolved labels.
 *
 * See {@link ResolvedRowDescriptor} note on `*Lower` semantics.
 */
export type ResolvedFlagDescriptor = {
    key: string;
    label: string;
    labelLower: string;
    assistive: string | null;
    assistiveLower: string | null;
};

/**
 * Resolved descriptor for a single dataset source field.
 *
 * See {@link ResolvedRowDescriptor} note on `*Lower` semantics — the engine
 * compares against `nameLower`, not `name`.
 */
export type ResolvedFieldDescriptor = {
    name: string;
    nameLower: string;
    applicableFlags: ResolvedFlagDescriptor[];
};

/**
 * Resolved descriptor for the Dataset section.
 *
 * See {@link ResolvedRowDescriptor} note on `*Lower` semantics.
 */
export type ResolvedDatasetDescriptor = {
    sectionId: 'dataset';
    heading: string;
    headingLower: string;
    fields: ResolvedFieldDescriptor[];
};

/** Per-row filter result inside a flat section. */
export type RowMatch = {
    visible: boolean;
    highlights: RowHighlights;
};

/** Per-section filter result for a flat section. */
export type SectionMatchView = {
    headingHighlights: HighlightRange[] | null;
    rows: Map<string, RowMatch>;
};

/**
 * Per-field filter result inside the Dataset tree.
 *
 * `matchReason === 'field-name'` means every applicable flag stays visible
 * (the field itself matched). `matchReason === 'flag'` means only the
 * flags whose label/assistive text matched are kept, with the parent
 * field retained for context.
 */
export type FieldMatch = {
    matchReason: 'field-name' | 'flag';
    visibleFlags: Set<string>;
    highlights: {
        field: HighlightRange[] | null;
        flags: Map<string, RowHighlights>;
    };
};

/** Dataset-specific tree match view. */
export type DatasetMatchView = {
    headingHighlights: HighlightRange[] | null;
    matchedFields: Map<string, FieldMatch>;
};

/**
 * Full match view for a single query evaluation.
 *
 * Invariant: when `datasetTree.matchedFields` is non-empty,
 * `matchedSections` includes `'dataset'`.
 */
export type MatchView = {
    matchedSections: Set<string>;
    sections: Map<string, SectionMatchView>;
    datasetTree: DatasetMatchView | null;
};

/**
 * Input bundle for `buildMatchView`.
 *
 * `query` must already be case-folded by the caller (resolver step) so
 * the engine itself can compare strictly. `sections` and `dataset` hold
 * fully resolved strings — no i18n keys or `translate` closures.
 */
export type MatchEngineInput = {
    /** Lowercased / case-folded query; `''` short-circuits to all-visible. */
    query: string;
    sections: readonly ResolvedSectionDescriptor[];
    dataset: ResolvedDatasetDescriptor | null;
};
