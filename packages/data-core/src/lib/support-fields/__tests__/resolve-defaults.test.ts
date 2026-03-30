import { describe, expect, it } from 'vitest';
import { resolveFieldDefaults } from '../resolve-defaults';
import type { SupportFieldMasterSettings } from '../types';

const HIGHLIGHT_ON: SupportFieldMasterSettings = {
    crossHighlightEnabled: true,
    crossFilterEnabled: false
};

const ALL_OFF: SupportFieldMasterSettings = {
    crossHighlightEnabled: false,
    crossFilterEnabled: false
};

describe('resolveFieldDefaults', () => {
    describe('new spec defaults', () => {
        describe('measure fields', () => {
            it('should enable highlight only when cross-highlight is on', () => {
                const result = resolveFieldDefaults({
                    masterSettings: HIGHLIGHT_ON,
                    fieldRole: 'aggregation',
                    isLegacy: false
                });
                expect(result.highlight).toBe(true);
                expect(result.highlightStatus).toBe(false);
                expect(result.highlightComparator).toBe(false);
            });

            it('should disable all highlight flags when cross-highlight is off', () => {
                const result = resolveFieldDefaults({
                    masterSettings: ALL_OFF,
                    fieldRole: 'aggregation',
                    isLegacy: false
                });
                expect(result.highlight).toBe(false);
                expect(result.highlightStatus).toBe(false);
                expect(result.highlightComparator).toBe(false);
            });

            it('should disable format and formatted by default', () => {
                const result = resolveFieldDefaults({
                    masterSettings: HIGHLIGHT_ON,
                    fieldRole: 'aggregation',
                    isLegacy: false
                });
                expect(result.format).toBe(false);
                expect(result.formatted).toBe(false);
            });
        });

        describe('column fields', () => {
            it('should disable all highlight flags regardless of master setting', () => {
                const result = resolveFieldDefaults({
                    masterSettings: HIGHLIGHT_ON,
                    fieldRole: 'grouping',
                    isLegacy: false
                });
                expect(result.highlight).toBe(false);
                expect(result.highlightStatus).toBe(false);
                expect(result.highlightComparator).toBe(false);
            });

            it('should disable format and formatted by default', () => {
                const result = resolveFieldDefaults({
                    masterSettings: HIGHLIGHT_ON,
                    fieldRole: 'grouping',
                    isLegacy: false
                });
                expect(result.format).toBe(false);
                expect(result.formatted).toBe(false);
            });
        });
    });

    describe('legacy spec defaults', () => {
        it('should enable all highlight flags for measures when cross-highlight is on', () => {
            const result = resolveFieldDefaults({
                masterSettings: HIGHLIGHT_ON,
                fieldRole: 'aggregation',
                isLegacy: true
            });
            expect(result.highlight).toBe(true);
            expect(result.highlightStatus).toBe(true);
            expect(result.highlightComparator).toBe(true);
        });

        it('should enable format and formatted for measures', () => {
            const result = resolveFieldDefaults({
                masterSettings: HIGHLIGHT_ON,
                fieldRole: 'aggregation',
                isLegacy: true
            });
            expect(result.format).toBe(true);
            expect(result.formatted).toBe(true);
        });

        it('should disable highlight flags for columns even in legacy mode', () => {
            const result = resolveFieldDefaults({
                masterSettings: HIGHLIGHT_ON,
                fieldRole: 'grouping',
                isLegacy: true
            });
            expect(result.highlight).toBe(false);
            expect(result.highlightStatus).toBe(false);
            expect(result.highlightComparator).toBe(false);
        });

        it('should disable format and formatted for columns in legacy mode', () => {
            const result = resolveFieldDefaults({
                masterSettings: ALL_OFF,
                fieldRole: 'grouping',
                isLegacy: true
            });
            expect(result.format).toBe(false);
            expect(result.formatted).toBe(false);
        });
    });
});
