import { bench, describe } from 'vitest';
import { buildProcessingPlan } from '../build-processing-plan';
import type { SupportFieldMasterSettings } from '../types';
import { makeFieldMetadata, makeParameterGroups } from './_fixtures';

const FIELD_TIERS = [
    { label: '2 fields', count: 2 },
    { label: '10 fields', count: 10 },
    { label: '50 fields', count: 50 }
] as const;

const masterSettings: SupportFieldMasterSettings = {
    crossHighlightEnabled: true,
    crossFilterEnabled: true
};

// Build metadata arrays once at module scope for each tier × variant combo.
// buildProcessingPlan inputs are row-invariant — building them per iteration
// would measure allocation, not plan construction.
const fieldsOnlyByTier = new Map(
    FIELD_TIERS.map((tier) => [
        tier.label,
        { fields: makeFieldMetadata(tier.count), parameterGroups: undefined }
    ])
);

const withParametersByTier = new Map(
    FIELD_TIERS.map((tier) => [
        tier.label,
        {
            fields: makeFieldMetadata(tier.count, {
                withParameterGroups: true
            }),
            parameterGroups: makeParameterGroups(tier.count)
        }
    ])
);

describe('buildProcessingPlan', () => {
    describe('fields only', () => {
        for (const tier of FIELD_TIERS) {
            const input = fieldsOnlyByTier.get(tier.label)!;
            bench(tier.label, () => {
                buildProcessingPlan({
                    fields: input.fields,
                    configuration: {},
                    masterSettings,
                    hasHighlights: true,
                    isLegacy: false,
                    parameterGroups: input.parameterGroups
                });
            });
        }
    });

    describe('with parameter groups', () => {
        for (const tier of FIELD_TIERS) {
            const input = withParametersByTier.get(tier.label)!;
            bench(tier.label, () => {
                buildProcessingPlan({
                    fields: input.fields,
                    configuration: {},
                    masterSettings,
                    hasHighlights: true,
                    isLegacy: false,
                    parameterGroups: input.parameterGroups
                });
            });
        }
    });
});
