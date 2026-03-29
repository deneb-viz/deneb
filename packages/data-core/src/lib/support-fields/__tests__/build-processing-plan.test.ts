import { describe, expect, it } from 'vitest';
import { buildProcessingPlan } from '../build-processing-plan';
import type {
    SupportFieldConfiguration,
    SupportFieldMasterSettings
} from '../types';
import type { DatasetFieldRole } from '../../field/types';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const HIGHLIGHT_ON: SupportFieldMasterSettings = {
    crossHighlightEnabled: true,
    crossFilterEnabled: false
};

const ALL_ON: SupportFieldMasterSettings = {
    crossHighlightEnabled: true,
    crossFilterEnabled: true
};

const ALL_OFF: SupportFieldMasterSettings = {
    crossHighlightEnabled: false,
    crossFilterEnabled: false
};

const FILTER_ON: SupportFieldMasterSettings = {
    crossHighlightEnabled: false,
    crossFilterEnabled: true
};

const makeMeasureField = (encodedName: string, sourceIndex = 0) => ({
    encodedName,
    sourceIndex,
    role: 'aggregation' as DatasetFieldRole
});

const makeColumnField = (encodedName: string, sourceIndex = 0) => ({
    encodedName,
    sourceIndex,
    role: 'grouping' as DatasetFieldRole
});

const EMPTY_CONFIG: SupportFieldConfiguration = {};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildProcessingPlan', () => {
    describe('empty field list', () => {
        it('should return a plan with an empty fields array', () => {
            const plan = buildProcessingPlan({
                fields: [],
                configuration: EMPTY_CONFIG,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: true,
                isLegacy: false
            });
            expect(plan.fields).toEqual([]);
        });

        it('should set emitSelected from crossFilterEnabled', () => {
            const plan = buildProcessingPlan({
                fields: [],
                configuration: EMPTY_CONFIG,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: false,
                isLegacy: false
            });
            expect(plan.emitSelected).toBe(false);
        });

        it('should pass through hasHighlights', () => {
            const plan = buildProcessingPlan({
                fields: [],
                configuration: EMPTY_CONFIG,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: true,
                isLegacy: false
            });
            expect(plan.hasHighlights).toBe(true);
        });
    });

    describe('unconfigured measure — new spec — highlight on', () => {
        it('should emit highlight only', () => {
            const plan = buildProcessingPlan({
                fields: [makeMeasureField('Sales')],
                configuration: EMPTY_CONFIG,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: true,
                isLegacy: false
            });
            const instr = plan.fields[0];
            expect(instr.emitHighlight).toBe(true);
            expect(instr.emitHighlightStatus).toBe(false);
            expect(instr.emitHighlightComparator).toBe(false);
            expect(instr.emitFormat).toBe(false);
            expect(instr.emitFormatted).toBe(false);
        });

        it('should carry through encodedName, sourceIndex and role', () => {
            const plan = buildProcessingPlan({
                fields: [
                    {
                        encodedName: 'Sales',
                        sourceIndex: 3,
                        role: 'aggregation'
                    }
                ],
                configuration: EMPTY_CONFIG,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: true,
                isLegacy: false
            });
            const instr = plan.fields[0];
            expect(instr.encodedName).toBe('Sales');
            expect(instr.sourceIndex).toBe(3);
            expect(instr.role).toBe('aggregation');
        });
    });

    describe('unconfigured measure — new spec — highlight off', () => {
        it('should disable all emit flags', () => {
            const plan = buildProcessingPlan({
                fields: [makeMeasureField('Sales')],
                configuration: EMPTY_CONFIG,
                masterSettings: ALL_OFF,
                hasHighlights: false,
                isLegacy: false
            });
            const instr = plan.fields[0];
            expect(instr.emitHighlight).toBe(false);
            expect(instr.emitHighlightStatus).toBe(false);
            expect(instr.emitHighlightComparator).toBe(false);
            expect(instr.emitFormat).toBe(false);
            expect(instr.emitFormatted).toBe(false);
        });
    });

    describe('unconfigured column — new spec', () => {
        it('should disable all emit flags regardless of master settings', () => {
            const plan = buildProcessingPlan({
                fields: [makeColumnField('Category')],
                configuration: EMPTY_CONFIG,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: true,
                isLegacy: false
            });
            const instr = plan.fields[0];
            expect(instr.emitHighlight).toBe(false);
            expect(instr.emitHighlightStatus).toBe(false);
            expect(instr.emitHighlightComparator).toBe(false);
            expect(instr.emitFormat).toBe(false);
            expect(instr.emitFormatted).toBe(false);
        });
    });

    describe('unconfigured measure — legacy spec — highlight on', () => {
        it('should enable all emit flags', () => {
            const plan = buildProcessingPlan({
                fields: [makeMeasureField('Sales')],
                configuration: EMPTY_CONFIG,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: true,
                isLegacy: true
            });
            const instr = plan.fields[0];
            expect(instr.emitHighlight).toBe(true);
            expect(instr.emitHighlightStatus).toBe(true);
            expect(instr.emitHighlightComparator).toBe(true);
            expect(instr.emitFormat).toBe(true);
            expect(instr.emitFormatted).toBe(true);
        });
    });

    describe('unconfigured column — legacy spec', () => {
        it('should disable all emit flags', () => {
            const plan = buildProcessingPlan({
                fields: [makeColumnField('Category')],
                configuration: EMPTY_CONFIG,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: true,
                isLegacy: true
            });
            const instr = plan.fields[0];
            expect(instr.emitHighlight).toBe(false);
            expect(instr.emitHighlightStatus).toBe(false);
            expect(instr.emitHighlightComparator).toBe(false);
            expect(instr.emitFormat).toBe(false);
            expect(instr.emitFormatted).toBe(false);
        });
    });

    describe('configured field overrides defaults', () => {
        it('should use explicit config flags regardless of master settings or legacy', () => {
            const config: SupportFieldConfiguration = {
                Sales: {
                    highlight: false,
                    highlightStatus: true,
                    highlightComparator: false,
                    format: true,
                    formatted: false
                }
            };
            // Even with HIGHLIGHT_ON + legacy=true, config wins
            const plan = buildProcessingPlan({
                fields: [makeMeasureField('Sales')],
                configuration: config,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: true,
                isLegacy: true
            });
            const instr = plan.fields[0];
            expect(instr.emitHighlight).toBe(false);
            expect(instr.emitHighlightStatus).toBe(true);
            expect(instr.emitHighlightComparator).toBe(false);
            expect(instr.emitFormat).toBe(true);
            expect(instr.emitFormatted).toBe(false);
        });

        it('should use all-false config when explicitly set', () => {
            const config: SupportFieldConfiguration = {
                Sales: {
                    highlight: false,
                    highlightStatus: false,
                    highlightComparator: false,
                    format: false,
                    formatted: false
                }
            };
            const plan = buildProcessingPlan({
                fields: [makeMeasureField('Sales')],
                configuration: config,
                masterSettings: ALL_ON,
                hasHighlights: true,
                isLegacy: true
            });
            const instr = plan.fields[0];
            expect(instr.emitHighlight).toBe(false);
            expect(instr.emitHighlightStatus).toBe(false);
            expect(instr.emitHighlightComparator).toBe(false);
            expect(instr.emitFormat).toBe(false);
            expect(instr.emitFormatted).toBe(false);
        });
    });

    describe('mix of configured and unconfigured fields', () => {
        it('should resolve each field independently', () => {
            const config: SupportFieldConfiguration = {
                Sales: {
                    highlight: true,
                    highlightStatus: true,
                    highlightComparator: true,
                    format: true,
                    formatted: true
                }
            };
            const plan = buildProcessingPlan({
                fields: [
                    makeMeasureField('Sales', 0),
                    makeColumnField('Category', 1)
                ],
                configuration: config,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: false,
                isLegacy: false
            });

            // Configured field uses explicit flags
            const salesInstr = plan.fields[0];
            expect(salesInstr.emitHighlight).toBe(true);
            expect(salesInstr.emitHighlightStatus).toBe(true);
            expect(salesInstr.emitHighlightComparator).toBe(true);
            expect(salesInstr.emitFormat).toBe(true);
            expect(salesInstr.emitFormatted).toBe(true);

            // Unconfigured column falls through to defaults
            const categoryInstr = plan.fields[1];
            expect(categoryInstr.emitHighlight).toBe(false);
            expect(categoryInstr.emitHighlightStatus).toBe(false);
            expect(categoryInstr.emitHighlightComparator).toBe(false);
            expect(categoryInstr.emitFormat).toBe(false);
            expect(categoryInstr.emitFormatted).toBe(false);
        });

        it('should preserve field order in output', () => {
            const plan = buildProcessingPlan({
                fields: [
                    makeMeasureField('Profit', 1),
                    makeColumnField('Region', 0),
                    makeMeasureField('Sales', 2)
                ],
                configuration: EMPTY_CONFIG,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: false,
                isLegacy: false
            });
            expect(plan.fields).toHaveLength(3);
            expect(plan.fields[0].encodedName).toBe('Profit');
            expect(plan.fields[1].encodedName).toBe('Region');
            expect(plan.fields[2].encodedName).toBe('Sales');
        });
    });

    describe('emitSelected reflects crossFilterEnabled', () => {
        it('should be true when crossFilterEnabled is true', () => {
            const plan = buildProcessingPlan({
                fields: [],
                configuration: EMPTY_CONFIG,
                masterSettings: FILTER_ON,
                hasHighlights: false,
                isLegacy: false
            });
            expect(plan.emitSelected).toBe(true);
        });

        it('should be false when crossFilterEnabled is false', () => {
            const plan = buildProcessingPlan({
                fields: [],
                configuration: EMPTY_CONFIG,
                masterSettings: HIGHLIGHT_ON,
                hasHighlights: false,
                isLegacy: false
            });
            expect(plan.emitSelected).toBe(false);
        });
    });

    describe('hasHighlights passed through', () => {
        it('should be true when passed as true', () => {
            const plan = buildProcessingPlan({
                fields: [],
                configuration: EMPTY_CONFIG,
                masterSettings: ALL_OFF,
                hasHighlights: true,
                isLegacy: false
            });
            expect(plan.hasHighlights).toBe(true);
        });

        it('should be false when passed as false', () => {
            const plan = buildProcessingPlan({
                fields: [],
                configuration: EMPTY_CONFIG,
                masterSettings: ALL_ON,
                hasHighlights: false,
                isLegacy: false
            });
            expect(plan.hasHighlights).toBe(false);
        });
    });
});
