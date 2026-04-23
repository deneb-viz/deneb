import { computeHighlightRanges } from './highlight-ranges';
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
    SectionId,
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
 * Returns `null` when the section has no matches (section gets hidden).
 */
const matchSection = (
    section: ResolvedSectionDescriptor,
    query: string
): SectionMatchView | null => {
    const headingRanges = rangesOrNull(
        computeHighlightRanges(section.heading, query)
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
            computeHighlightRanges(row.label, query)
        );
        const assistiveRanges =
            row.assistive !== null
                ? rangesOrNull(computeHighlightRanges(row.assistive, query))
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
 * Returns `null` when the dataset section has no matches (section is
 * hidden alongside the flat sections).
 */
const matchDataset = (
    dataset: ResolvedDatasetDescriptor,
    query: string
): DatasetMatchView | null => {
    const headingRanges = rangesOrNull(
        computeHighlightRanges(dataset.heading, query)
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
            computeHighlightRanges(field.name, query)
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
                computeHighlightRanges(flag.label, query)
            );
            const assistiveRanges =
                flag.assistive !== null
                    ? rangesOrNull(
                          computeHighlightRanges(flag.assistive, query)
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
    const matchedSections = new Set<SectionId>();
    const sections = new Map<Exclude<SectionId, 'dataset'>, SectionMatchView>();
    for (const section of input.sections) {
        matchedSections.add(section.id);
        const rows = new Map<string, RowMatch>();
        for (const row of section.rows) rows.set(row.id, fullyVisibleRow());
        sections.set(section.id, { headingHighlights: null, rows });
    }
    let datasetTree: DatasetMatchView | null = null;
    if (input.dataset) {
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
 * When `query` is empty, returns an all-visible sentinel so render layers
 * do not need to special-case "no active filter". Otherwise applies the
 * filter semantics described by the plan's R3 (flat sections) and R4
 * (Dataset tree).
 */
export const buildMatchView = (input: MatchEngineInput): MatchView => {
    if (input.query === '') return buildAllVisibleMatchView(input);

    const matchedSections = new Set<SectionId>();
    const sections = new Map<Exclude<SectionId, 'dataset'>, SectionMatchView>();

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
