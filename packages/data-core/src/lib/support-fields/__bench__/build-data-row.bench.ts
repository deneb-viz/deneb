import { bench, describe } from 'vitest';
import { buildDataRow } from '../build-data-row';
import {
    generateBaseValues,
    makeFieldOnlyPlan,
    makeParameterHeavyPlan,
    makePassthroughProvider,
    makeRealisticProvider,
    slotCountForPlan
} from './_fixtures';

const ROW_TIERS = [
    { label: '1,000 rows', count: 1_000 },
    { label: '10,000 rows', count: 10_000 },
    // 100K tier gets a longer time budget so we still collect enough samples
    // for a meaningful distribution at ~tens-of-ms per iteration.
    { label: '100,000 rows', count: 100_000, time: 2_000 }
] as const;

const LOCALE = 'en-US';

// Build plans once at module scope.
const fieldOnlyPlan = makeFieldOnlyPlan(2);
const parameterHeavyPlan = makeParameterHeavyPlan(2);

// Generate base value arrays for every tier × plan shape once, at module
// scope. Per-iteration allocation would swamp the signal we care about.
const fieldOnlySlots = slotCountForPlan(fieldOnlyPlan);
const parameterHeavySlots = slotCountForPlan(parameterHeavyPlan);

const fieldOnlyRowsByTier = new Map(
    ROW_TIERS.map((tier) => [
        tier.label,
        generateBaseValues(tier.count, fieldOnlySlots)
    ])
);
const parameterHeavyRowsByTier = new Map(
    ROW_TIERS.map((tier) => [
        tier.label,
        generateBaseValues(tier.count, parameterHeavySlots)
    ])
);

const passthroughProvider = makePassthroughProvider();
const realisticProvider = makeRealisticProvider();

describe('buildDataRow', () => {
    describe('field-only plan, passthrough provider', () => {
        for (const tier of ROW_TIERS) {
            const rows = fieldOnlyRowsByTier.get(tier.label)!;
            bench(
                tier.label,
                () => {
                    for (let i = 0; i < tier.count; i++) {
                        buildDataRow({
                            plan: fieldOnlyPlan,
                            provider: passthroughProvider,
                            baseValues: rows[i]!,
                            rowIndex: i,
                            locale: LOCALE
                        });
                    }
                },
                'time' in tier ? { time: tier.time } : undefined
            );
        }
    });

    describe('field-only plan, realistic provider', () => {
        for (const tier of ROW_TIERS) {
            const rows = fieldOnlyRowsByTier.get(tier.label)!;
            bench(
                tier.label,
                () => {
                    for (let i = 0; i < tier.count; i++) {
                        buildDataRow({
                            plan: fieldOnlyPlan,
                            provider: realisticProvider,
                            baseValues: rows[i]!,
                            rowIndex: i,
                            locale: LOCALE
                        });
                    }
                },
                'time' in tier ? { time: tier.time } : undefined
            );
        }
    });

    describe('parameter-heavy plan, passthrough provider', () => {
        for (const tier of ROW_TIERS) {
            const rows = parameterHeavyRowsByTier.get(tier.label)!;
            bench(
                tier.label,
                () => {
                    for (let i = 0; i < tier.count; i++) {
                        buildDataRow({
                            plan: parameterHeavyPlan,
                            provider: passthroughProvider,
                            baseValues: rows[i]!,
                            rowIndex: i,
                            locale: LOCALE
                        });
                    }
                },
                'time' in tier ? { time: tier.time } : undefined
            );
        }
    });

    describe('parameter-heavy plan, realistic provider', () => {
        for (const tier of ROW_TIERS) {
            const rows = parameterHeavyRowsByTier.get(tier.label)!;
            bench(
                tier.label,
                () => {
                    for (let i = 0; i < tier.count; i++) {
                        buildDataRow({
                            plan: parameterHeavyPlan,
                            provider: realisticProvider,
                            baseValues: rows[i]!,
                            rowIndex: i,
                            locale: LOCALE
                        });
                    }
                },
                'time' in tier ? { time: tier.time } : undefined
            );
        }
    });
});
