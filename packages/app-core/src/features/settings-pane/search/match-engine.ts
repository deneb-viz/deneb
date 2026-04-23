import { computeHighlightRangesLowered } from './highlight-ranges';
import type {
    DatasetMatchView,
    FieldMatch,
    HighlightRange,
    MatchEngineInput,
    MatchView,
    ResolvedDatasetDescriptor,
    ResolvedSectionDescriptor,
    RowHighlights,
    RowMatch,
    SectionMatchView
} from './types';

const rangesOrNull = (ranges: HighlightRange[]): HighlightRange[] | null =>
    ranges.length > 0 ? ranges : null;

const isNonEmpty = <T>(value: T[] | null): value is T[] =>
    value !== null && value.length > 0;

/**
 * Build a row match where every surface is visible with no highlights.
 * Used when the parent section matched on its heading (everything inside
 * stays visible) or when no query is active.
 */
const fullyVisibleRow = (): RowMatch => ({
    visible: true,
    highlights: {}
});

/**
 * Compute a `SectionMatchView` for a flat section given the current query.
 *
 * `queryLower` is the already-folded query from `resolveQuery`; every
 * comparison uses the `*Lower` surfaces on the descriptor so no
 * per-keystroke `.toLowerCase()` calls happen here.
 *
 * Returns `null` when the section has no matches (section gets hidden).
 */
const matchSection = (
    section: ResolvedSectionDescriptor,
    queryLower: string
): SectionMatchView | null => {
    const headingRanges = rangesOrNull(
        computeHighlightRangesLowered(section.headingLower, queryLower)
    );

    if (isNonEmpty(headingRanges)) {
        // Heading match keeps the whole section open with every row visible
        // and no row-level highlights.
        const rows = new Map<string, RowMatch>();
        for (const row of section.rows) rows.set(row.id, fullyVisibleRow());
        return { headingHighlights: headingRanges, rows };
    }

    const rows = new Map<string, RowMatch>();
    let anyRowMatched = false;
    for (const row of section.rows) {
        const labelRanges = rangesOrNull(
            computeHighlightRangesLowered(row.labelLower, queryLower)
        );
        const assistiveRanges =
            row.assistiveLower !== null
                ? rangesOrNull(
                      computeHighlightRangesLowered(
                          row.assistiveLower,
                          queryLower
                      )
                  )
                : null;
        const visible = isNonEmpty(labelRanges) || isNonEmpty(assistiveRanges);
        if (!visible) continue;
        anyRowMatched = true;
        const highlights: RowHighlights = {};
        if (isNonEmpty(labelRanges)) highlights.label = labelRanges;
        if (isNonEmpty(assistiveRanges)) highlights.assistive = assistiveRanges;
        rows.set(row.id, { visible: true, highlights });
    }

    if (!anyRowMatched) return null;
    return { headingHighlights: null, rows };
};

/**
 * Compute the `DatasetMatchView` for the given query.
 *
 * `queryLower` is the already-folded query from `resolveQuery`; every
 * comparison uses the `*Lower` surfaces on the descriptor.
 *
 * Returns `null` when the dataset section has no matches (section is
 * hidden alongside the flat sections).
 */
const matchDataset = (
    dataset: ResolvedDatasetDescriptor,
    queryLower: string
): DatasetMatchView | null => {
    const headingRanges = rangesOrNull(
        computeHighlightRangesLowered(dataset.headingLower, queryLower)
    );

    if (isNonEmpty(headingRanges)) {
        // Heading match: every field visible with all its flags.
        const matchedFields = new Map<string, FieldMatch>();
        for (const field of dataset.fields) {
            const visibleFlags = new Set<string>(
                field.applicableFlags.map((f) => f.key)
            );
            matchedFields.set(field.name, {
                matchReason: 'field-name',
                visibleFlags,
                highlights: { field: null, flags: new Map() }
            });
        }
        return { headingHighlights: headingRanges, matchedFields };
    }

    const matchedFields = new Map<string, FieldMatch>();
    for (const field of dataset.fields) {
        const fieldNameRanges = rangesOrNull(
            computeHighlightRangesLowered(field.nameLower, queryLower)
        );

        if (isNonEmpty(fieldNameRanges)) {
            // Field-name match: show every applicable flag for this field.
            const visibleFlags = new Set<string>(
                field.applicableFlags.map((f) => f.key)
            );
            matchedFields.set(field.name, {
                matchReason: 'field-name',
                visibleFlags,
                highlights: {
                    field: fieldNameRanges,
                    flags: new Map()
                }
            });
            continue;
        }

        // Otherwise walk each flag and keep those that match on label or
        // assistive text; parent field is retained for context.
        const visibleFlags = new Set<string>();
        const flagHighlights = new Map<string, RowHighlights>();
        for (const flag of field.applicableFlags) {
            const labelRanges = rangesOrNull(
                computeHighlightRangesLowered(flag.labelLower, queryLower)
            );
            const assistiveRanges =
                flag.assistiveLower !== null
                    ? rangesOrNull(
                          computeHighlightRangesLowered(
                              flag.assistiveLower,
                              queryLower
                          )
                      )
                    : null;
            const visible =
                isNonEmpty(labelRanges) || isNonEmpty(assistiveRanges);
            if (!visible) continue;
            visibleFlags.add(flag.key);
            const highlights: RowHighlights = {};
            if (isNonEmpty(labelRanges)) highlights.label = labelRanges;
            if (isNonEmpty(assistiveRanges))
                highlights.assistive = assistiveRanges;
            flagHighlights.set(flag.key, highlights);
        }

        if (visibleFlags.size === 0) continue;
        matchedFields.set(field.name, {
            matchReason: 'flag',
            visibleFlags,
            highlights: { field: null, flags: flagHighlights }
        });
    }

    if (matchedFields.size === 0) return null;
    return { headingHighlights: null, matchedFields };
};

/**
 * Build an "all visible" `MatchView` for the empty-query short-circuit.
 * Every section is visible with every row unfiltered and no highlights.
 */
const buildAllVisibleMatchView = (input: MatchEngineInput): MatchView => {
    const matchedSections = new Set<string>();
    const sections = new Map<string, SectionMatchView>();
    for (const section of input.sections) {
        matchedSections.add(section.id);
        const rows = new Map<string, RowMatch>();
        for (const row of section.rows) rows.set(row.id, fullyVisibleRow());
        sections.set(section.id, { headingHighlights: null, rows });
    }
    let datasetTree: DatasetMatchView | null = null;
    if (input.dataset && input.dataset.fields.length > 0) {
        matchedSections.add('dataset');
        const matchedFields = new Map<string, FieldMatch>();
        for (const field of input.dataset.fields) {
            const visibleFlags = new Set<string>(
                field.applicableFlags.map((f) => f.key)
            );
            matchedFields.set(field.name, {
                matchReason: 'field-name',
                visibleFlags,
                highlights: { field: null, flags: new Map() }
            });
        }
        datasetTree = { headingHighlights: null, matchedFields };
    }
    return { matchedSections, sections, datasetTree };
};

/**
 * Compute the `MatchView` for the given query against a set of resolved
 * section descriptors and an optional resolved dataset descriptor.
 *
 * `input.query` MUST already be case-folded by `resolveQuery` — the
 * engine compares against the pre-lowered `*Lower` surfaces on each
 * descriptor and does no folding itself. This is the fast path.
 *
 * When `query` is empty, returns an all-visible sentinel so render layers
 * do not need to special-case "no active filter". Otherwise applies the
 * filter semantics described by the plan's R3 (flat sections) and R4
 * (Dataset tree).
 */
export const buildMatchView = (input: MatchEngineInput): MatchView => {
    if (input.query === '') return buildAllVisibleMatchView(input);

    const matchedSections = new Set<string>();
    const sections = new Map<string, SectionMatchView>();

    for (const section of input.sections) {
        const view = matchSection(section, input.query);
        if (view === null) continue;
        matchedSections.add(section.id);
        sections.set(section.id, view);
    }

    let datasetTree: DatasetMatchView | null = null;
    if (input.dataset) {
        datasetTree = matchDataset(input.dataset, input.query);
        if (datasetTree && datasetTree.matchedFields.size > 0) {
            matchedSections.add('dataset');
        }
    }

    return { matchedSections, sections, datasetTree };
};
