/**
 * Scale benchmarks for the settings-pane dataset search path.
 *
 * Scenario: 1,000 source fields × a mix of measures/columns, each
 * with the full applicable-flag set. The descriptor is built ONCE at
 * module scope — per-iteration allocation would measure construction,
 * not the function under test.
 *
 * Budget note: R9 calls for p95 keystroke-to-match < 50ms at this
 * scale. Bench output is observational — don't fail CI on it, but
 * surface regressions in the baselines pipeline when available.
 */
import { bench, describe } from 'vitest';

import { buildMatchView } from '../match-engine';
import { buildResolvedDatasetDescriptor } from '../dataset-indexer';
import type { SourceFieldEntry } from '../dataset-indexer';
import type { DatasetField } from '@deneb-viz/data-core/field';
import type { SupportFieldMasterSettings } from '@deneb-viz/data-core/support-fields';

const FIELD_COUNT = 1_000;

const masterSettings: SupportFieldMasterSettings = {
    crossHighlightEnabled: true,
    crossFilterEnabled: true
};

/** Alternate measures and columns so every applicable-flag path runs. */
const sourceFields: SourceFieldEntry[] = Array.from(
    { length: FIELD_COUNT },
    (_, i): SourceFieldEntry => {
        const field: DatasetField =
            i % 3 === 0
                ? { role: 'aggregation' }
                : i % 5 === 0
                  ? { role: 'field-parameter' }
                  : { role: 'grouping' };
        return [`field_${i}`, field] as const;
    }
);

// Identity translator — benches don't exercise i18n. Using the key
// itself as the resolved string keeps the match surface realistic.
const translate = (key: string): string => key;

const descriptor = buildResolvedDatasetDescriptor({
    sourceFields,
    config: {},
    masterSettings,
    isLegacy: false,
    highlightEnabled: true,
    consolidateFieldParameters: true,
    translate,
    headingKey: 'Text_Settings_Dataset'
});

describe('dataset search at scale (1,000 fields × 7 flags)', () => {
    bench('field-name match (mid-list: "field_500")', () => {
        buildMatchView({
            query: 'field_500',
            sections: [],
            dataset: descriptor
        });
    });

    bench('no-match query ("zzz_nomatch_zzz")', () => {
        buildMatchView({
            query: 'zzz_nomatch_zzz',
            sections: [],
            dataset: descriptor
        });
    });

    bench('heading match ("Text_Settings_Dataset")', () => {
        buildMatchView({
            query: 'text_settings_dataset',
            sections: [],
            dataset: descriptor
        });
    });

    bench('flag-label match ("highlight")', () => {
        buildMatchView({
            query: 'highlight',
            sections: [],
            dataset: descriptor
        });
    });

    bench('field-name single-character query ("f")', () => {
        buildMatchView({
            query: 'f',
            sections: [],
            dataset: descriptor
        });
    });
});
