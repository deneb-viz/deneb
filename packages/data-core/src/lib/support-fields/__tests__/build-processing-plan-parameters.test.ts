import { describe, expect, it } from 'vitest';
import { buildProcessingPlan } from '../build-processing-plan';
import type { SupportFieldConfiguration } from '../types';

describe('buildProcessingPlan — field parameters', () => {
    const masterSettings = {
        crossHighlightEnabled: false,
        crossFilterEnabled: false
    };

    it('should produce a parameter instruction for grouped fields', () => {
        const plan = buildProcessingPlan({
            fields: [
                {
                    encodedName: 'Country Code',
                    sourceIndex: 0,
                    role: 'grouping'
                },
                { encodedName: 'Segment', sourceIndex: 1, role: 'grouping' },
                { encodedName: '$ Sales', sourceIndex: 0, role: 'aggregation' }
            ],
            configuration: {},
            masterSettings,
            hasHighlights: false,
            isLegacy: false,
            parameterGroups: [
                {
                    parameterName: 'Dynamic Category',
                    componentFieldIndices: [0, 1],
                    componentNames: ['Country Code', 'Segment'],
                    componentRoles: ['grouping', 'grouping'],
                    formatStrings: undefined
                }
            ]
        });

        expect(plan.fields).toHaveLength(2);

        const paramInstr = plan.fields[0];
        expect(paramInstr.kind).toBe('parameter');
        if (paramInstr.kind === 'parameter') {
            expect(paramInstr.encodedName).toBe('Dynamic Category');
            expect(paramInstr.componentIndices).toEqual([0, 1]);
            expect(paramInstr.namesArray).toEqual(['Country Code', 'Segment']);
            expect(paramInstr.componentRoles).toEqual(['grouping', 'grouping']);
        }

        const fieldInstr = plan.fields[1];
        expect(fieldInstr.kind).toBe('field');
        if (fieldInstr.kind === 'field') {
            expect(fieldInstr.encodedName).toBe('$ Sales');
        }
    });

    it('should use explicit config for parameter by encoded parameter name', () => {
        const config: SupportFieldConfiguration = {
            'Dynamic Category': {
                highlight: false,
                highlightStatus: false,
                highlightComparator: false,
                format: true,
                formatted: true
            }
        };
        const plan = buildProcessingPlan({
            fields: [
                {
                    encodedName: 'Country Code',
                    sourceIndex: 0,
                    role: 'grouping'
                }
            ],
            configuration: config,
            masterSettings,
            hasHighlights: false,
            isLegacy: false,
            parameterGroups: [
                {
                    parameterName: 'Dynamic Category',
                    componentFieldIndices: [0],
                    componentNames: ['Country Code'],
                    componentRoles: ['grouping'],
                    formatStrings: ['']
                }
            ]
        });

        const instr = plan.fields[0];
        expect(instr.kind).toBe('parameter');
        if (instr.kind === 'parameter') {
            expect(instr.emitFormat).toBe(true);
            expect(instr.emitFormatted).toBe(true);
        }
    });

    it('should use default flags when no explicit config for parameter', () => {
        const plan = buildProcessingPlan({
            fields: [
                {
                    encodedName: 'Country Code',
                    sourceIndex: 0,
                    role: 'grouping'
                }
            ],
            configuration: {},
            masterSettings,
            hasHighlights: false,
            isLegacy: false,
            parameterGroups: [
                {
                    parameterName: 'Dynamic Category',
                    componentFieldIndices: [0],
                    componentNames: ['Country Code'],
                    componentRoles: ['grouping'],
                    formatStrings: undefined
                }
            ]
        });

        const instr = plan.fields[0];
        expect(instr.kind).toBe('parameter');
        if (instr.kind === 'parameter') {
            expect(instr.emitFormat).toBe(false);
            expect(instr.emitFormatted).toBe(false);
        }
    });

    it('should pass through formatStrings when format is enabled', () => {
        const config: SupportFieldConfiguration = {
            'Dynamic Category': {
                highlight: false,
                highlightStatus: false,
                highlightComparator: false,
                format: true,
                formatted: false
            }
        };
        const plan = buildProcessingPlan({
            fields: [
                {
                    encodedName: 'Country Code',
                    sourceIndex: 0,
                    role: 'grouping'
                },
                { encodedName: '$ Sales', sourceIndex: 0, role: 'aggregation' }
            ],
            configuration: config,
            masterSettings,
            hasHighlights: false,
            isLegacy: false,
            parameterGroups: [
                {
                    parameterName: 'Dynamic Category',
                    componentFieldIndices: [0, 1],
                    componentNames: ['Country Code', '$ Sales'],
                    componentRoles: ['grouping', 'aggregation'],
                    formatStrings: ['', '$#,0']
                }
            ]
        });

        const instr = plan.fields[0];
        expect(instr.kind).toBe('parameter');
        if (instr.kind === 'parameter') {
            expect(instr.formatStringsArray).toEqual(['', '$#,0']);
        }
    });

    it('should produce only regular instructions when no parameter groups provided', () => {
        const plan = buildProcessingPlan({
            fields: [{ encodedName: 'Year', sourceIndex: 0, role: 'grouping' }],
            configuration: {},
            masterSettings,
            hasHighlights: false,
            isLegacy: false
        });

        expect(plan.fields).toHaveLength(1);
        expect(plan.fields[0].kind).toBe('field');
    });

    it('should handle multiple parameter groups', () => {
        const plan = buildProcessingPlan({
            fields: [
                { encodedName: 'Country', sourceIndex: 0, role: 'grouping' },
                { encodedName: 'Segment', sourceIndex: 1, role: 'grouping' },
                { encodedName: '$ Sales', sourceIndex: 0, role: 'aggregation' },
                { encodedName: '# Units', sourceIndex: 1, role: 'aggregation' },
                { encodedName: 'Year', sourceIndex: 2, role: 'grouping' }
            ],
            configuration: {},
            masterSettings,
            hasHighlights: false,
            isLegacy: false,
            parameterGroups: [
                {
                    parameterName: 'Dynamic Cat',
                    componentFieldIndices: [0, 1],
                    componentNames: ['Country', 'Segment'],
                    componentRoles: ['grouping', 'grouping'],
                    formatStrings: undefined
                },
                {
                    parameterName: 'Dynamic Meas',
                    componentFieldIndices: [2, 3],
                    componentNames: ['$ Sales', '# Units'],
                    componentRoles: ['aggregation', 'aggregation'],
                    formatStrings: undefined
                }
            ]
        });

        expect(plan.fields).toHaveLength(3);
        expect(plan.fields[0].kind).toBe('parameter');
        expect(plan.fields[1].kind).toBe('parameter');
        expect(plan.fields[2].kind).toBe('field');
        if (plan.fields[0].kind === 'parameter') {
            expect(plan.fields[0].encodedName).toBe('Dynamic Cat');
        }
        if (plan.fields[1].kind === 'parameter') {
            expect(plan.fields[1].encodedName).toBe('Dynamic Meas');
        }
    });

    it('should set highlight emit flags from resolved flags', () => {
        const highlightMasterSettings = {
            crossHighlightEnabled: true,
            crossFilterEnabled: false
        };
        const plan = buildProcessingPlan({
            fields: [
                {
                    encodedName: 'Country Code',
                    sourceIndex: 0,
                    role: 'grouping'
                },
                {
                    encodedName: '$ Sales',
                    sourceIndex: 0,
                    role: 'aggregation'
                }
            ],
            configuration: {},
            masterSettings: highlightMasterSettings,
            hasHighlights: true,
            isLegacy: false,
            parameterGroups: [
                {
                    parameterName: 'Mixed Param',
                    componentFieldIndices: [0, 1],
                    componentNames: ['Country Code', '$ Sales'],
                    componentRoles: ['grouping', 'aggregation'],
                    formatStrings: undefined
                }
            ]
        });

        const instr = plan.fields[0];
        expect(instr.kind).toBe('parameter');
        if (instr.kind === 'parameter') {
            expect(instr.emitHighlight).toBe(true);
            expect(instr.emitHighlightStatus).toBe(false);
            expect(instr.emitHighlightComparator).toBe(false);
            expect(instr.componentRoles).toEqual(['grouping', 'aggregation']);
        }
    });

    it('should emit independent parameter instructions when two groups share a component index', () => {
        const plan = buildProcessingPlan({
            fields: [
                { encodedName: 'Sales', sourceIndex: 0, role: 'aggregation' },
                { encodedName: 'Profit', sourceIndex: 1, role: 'aggregation' },
                { encodedName: 'Year', sourceIndex: 2, role: 'grouping' }
            ],
            configuration: {},
            masterSettings,
            hasHighlights: false,
            isLegacy: false,
            parameterGroups: [
                {
                    parameterName: 'Selected Metric',
                    componentFieldIndices: [0, 1],
                    componentNames: ['Sales', 'Profit'],
                    componentRoles: ['aggregation', 'aggregation'],
                    formatStrings: undefined
                },
                {
                    parameterName: 'Secondary Metric',
                    componentFieldIndices: [0, 2],
                    componentNames: ['Sales', 'Year'],
                    componentRoles: ['aggregation', 'grouping'],
                    formatStrings: undefined
                }
            ]
        });

        // Both parameter instructions emit; no regular field instruction is
        // emitted because every input field is consumed by at least one
        // parameter group (index 0 by both, indices 1 and 2 by one each).
        expect(plan.fields).toHaveLength(2);
        expect(plan.fields.every((f) => f.kind === 'parameter')).toBe(true);

        const selected = plan.fields[0];
        const secondary = plan.fields[1];
        if (
            selected.kind === 'parameter' &&
            secondary.kind === 'parameter'
        ) {
            expect(selected.encodedName).toBe('Selected Metric');
            expect(selected.componentIndices).toEqual([0, 1]);
            expect(selected.namesArray).toEqual(['Sales', 'Profit']);

            expect(secondary.encodedName).toBe('Secondary Metric');
            expect(secondary.componentIndices).toEqual([0, 2]);
            expect(secondary.namesArray).toEqual(['Sales', 'Year']);

            // Each instruction's namesArray must be its own reference — not
            // a shared array — so a future mutation in one path cannot leak
            // into another parameter's row output.
            expect(selected.namesArray).not.toBe(secondary.namesArray);
        }
    });

    it('should skip a shared component index exactly once in the regular field loop', () => {
        const plan = buildProcessingPlan({
            fields: [
                { encodedName: 'Sales', sourceIndex: 0, role: 'aggregation' },
                { encodedName: 'Profit', sourceIndex: 1, role: 'aggregation' },
                { encodedName: 'Year', sourceIndex: 2, role: 'grouping' },
                {
                    encodedName: 'NonParam',
                    sourceIndex: 3,
                    role: 'grouping'
                }
            ],
            configuration: {},
            masterSettings,
            hasHighlights: false,
            isLegacy: false,
            parameterGroups: [
                {
                    parameterName: 'Selected Metric',
                    componentFieldIndices: [0, 1],
                    componentNames: ['Sales', 'Profit'],
                    componentRoles: ['aggregation', 'aggregation'],
                    formatStrings: undefined
                },
                {
                    parameterName: 'Secondary Metric',
                    componentFieldIndices: [0, 2],
                    componentNames: ['Sales', 'Year'],
                    componentRoles: ['aggregation', 'grouping'],
                    formatStrings: undefined
                }
            ]
        });

        // Two parameter instructions plus exactly one regular field
        // instruction — proving the shared index is excluded from the
        // regular loop without being skipped twice (which would otherwise
        // also drop NonParam).
        expect(plan.fields).toHaveLength(3);
        const fieldInstructions = plan.fields.filter(
            (f) => f.kind === 'field'
        );
        expect(fieldInstructions).toHaveLength(1);
        expect(fieldInstructions[0].encodedName).toBe('NonParam');
    });

    it('should disable highlight emit flags when crossHighlight is off', () => {
        const plan = buildProcessingPlan({
            fields: [
                {
                    encodedName: '$ Sales',
                    sourceIndex: 0,
                    role: 'aggregation'
                }
            ],
            configuration: {},
            masterSettings,
            hasHighlights: false,
            isLegacy: false,
            parameterGroups: [
                {
                    parameterName: 'Dynamic Meas',
                    componentFieldIndices: [0],
                    componentNames: ['$ Sales'],
                    componentRoles: ['aggregation'],
                    formatStrings: undefined
                }
            ]
        });

        const instr = plan.fields[0];
        expect(instr.kind).toBe('parameter');
        if (instr.kind === 'parameter') {
            expect(instr.emitHighlight).toBe(false);
            expect(instr.emitHighlightStatus).toBe(false);
            expect(instr.emitHighlightComparator).toBe(false);
        }
    });
});
