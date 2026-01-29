import { describe, expect, it } from 'vitest';
import {
    replaceLegacySignalReferences,
    hasLegacySignalReferences,
    type SignalMigrationResult
} from '../migration';
import { SIGNAL_DENEB_CONTAINER, SIGNAL_PBI_CONTAINER_LEGACY } from '../deneb-container';

describe('replaceLegacySignalReferences', () => {
    it('should replace single legacy signal reference', () => {
        const spec = `{
            "signals": [
                { "name": "pbiContainer", "value": {} }
            ]
        }`;

        const result: SignalMigrationResult = replaceLegacySignalReferences(spec);

        expect(result.spec).toContain(SIGNAL_DENEB_CONTAINER);
        expect(result.spec).not.toContain(SIGNAL_PBI_CONTAINER_LEGACY);
        expect(result.hadLegacyReferences).toBe(true);
        expect(result.replacementCount).toBe(1);
    });

    it('should replace multiple legacy signal references', () => {
        const spec = `{
            "width": { "signal": "pbiContainer.width" },
            "height": { "signal": "pbiContainer.height" },
            "signals": [
                { "name": "customSignal", "update": "pbiContainer.scrollTop > 0" }
            ]
        }`;

        const result = replaceLegacySignalReferences(spec);

        expect(result.spec).toContain(`${SIGNAL_DENEB_CONTAINER}.width`);
        expect(result.spec).toContain(`${SIGNAL_DENEB_CONTAINER}.height`);
        expect(result.spec).toContain(`${SIGNAL_DENEB_CONTAINER}.scrollTop`);
        expect(result.spec).not.toContain(SIGNAL_PBI_CONTAINER_LEGACY);
        expect(result.hadLegacyReferences).toBe(true);
        expect(result.replacementCount).toBe(3);
    });

    it('should handle spec with no legacy references', () => {
        const spec = `{
            "width": { "signal": "denebContainer.width" },
            "height": { "signal": "denebContainer.height" }
        }`;

        const result = replaceLegacySignalReferences(spec);

        expect(result.spec).toBe(spec);
        expect(result.hadLegacyReferences).toBe(false);
        expect(result.replacementCount).toBe(0);
    });

    it('should replace pbiContainer even in string values', () => {
        const spec = `{
            "title": "This is not a pbiContainer reference in a string",
            "description": "pbiContainer should be replaced everywhere"
        }`;

        const result = replaceLegacySignalReferences(spec);

        // All occurrences should be replaced (including in strings)
        expect(result.spec).not.toContain('pbiContainer');
        expect(result.spec).toContain('denebContainer');
        expect(result.hadLegacyReferences).toBe(true);
        expect(result.replacementCount).toBe(2);
    });

    it('should use word boundaries to avoid partial matches', () => {
        const spec = `{
            "signals": [
                { "name": "myPbiContainerCustom", "value": 10 },
                { "name": "pbiContainer", "value": {} }
            ]
        }`;

        const result = replaceLegacySignalReferences(spec);

        // Only exact word match should be replaced
        expect(result.spec).toContain('myPbiContainerCustom');
        expect(result.spec).toContain(SIGNAL_DENEB_CONTAINER);
        expect(result.replacementCount).toBe(1);
    });

    it('should handle empty string', () => {
        const result = replaceLegacySignalReferences('');

        expect(result.spec).toBe('');
        expect(result.hadLegacyReferences).toBe(false);
        expect(result.replacementCount).toBe(0);
    });

    it('should migrate pbiContainerWidth to denebContainer.width', () => {
        const spec = '{ "update": "pbiContainerWidth - 20" }';

        const result = replaceLegacySignalReferences(spec);

        expect(result.spec).toBe('{ "update": "denebContainer.width - 20" }');
        expect(result.hadLegacyReferences).toBe(true);
        expect(result.replacementCount).toBe(1);
    });

    it('should migrate pbiContainerHeight to denebContainer.height', () => {
        const spec = '{ "update": "pbiContainerHeight - 50" }';

        const result = replaceLegacySignalReferences(spec);

        expect(result.spec).toBe('{ "update": "denebContainer.height - 50" }');
        expect(result.hadLegacyReferences).toBe(true);
        expect(result.replacementCount).toBe(1);
    });

    it('should migrate all legacy signal types together', () => {
        const spec = `{
            "width": { "signal": "pbiContainerWidth" },
            "height": { "signal": "pbiContainerHeight" },
            "signals": [
                { "name": "pbiContainer", "value": {} }
            ]
        }`;

        const result = replaceLegacySignalReferences(spec);

        expect(result.spec).toContain('denebContainer.width');
        expect(result.spec).toContain('denebContainer.height');
        expect(result.spec).toContain('"name": "denebContainer"');
        expect(result.spec).not.toContain('pbiContainerWidth');
        expect(result.spec).not.toContain('pbiContainerHeight');
        expect(result.spec).not.toContain('pbiContainer');
        expect(result.hadLegacyReferences).toBe(true);
        expect(result.replacementCount).toBe(3);
    });

    it('should handle Vega spec with pbiContainer signal references', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "width": { "signal": "pbiContainer.width" },
            "height": { "signal": "pbiContainer.height" },
            "signals": [
                {
                    "name": "pbiContainer",
                    "value": {
                        "width": 800,
                        "height": 600
                    }
                }
            ],
            "marks": [
                {
                    "type": "rect",
                    "encode": {
                        "update": {
                            "width": { "signal": "pbiContainer.width - 20" }
                        }
                    }
                }
            ]
        }`;

        const result = replaceLegacySignalReferences(spec);

        expect(result.hadLegacyReferences).toBe(true);
        expect(result.replacementCount).toBe(4); // 4 occurrences
        expect(result.spec).toContain(`"name": "${SIGNAL_DENEB_CONTAINER}"`);
        expect(result.spec).toContain(`${SIGNAL_DENEB_CONTAINER}.width`);
        expect(result.spec).toContain(`${SIGNAL_DENEB_CONTAINER}.height`);
    });

    it('should handle Vega-Lite spec with pbiContainer param references', () => {
        const spec = `{
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "params": [
                {
                    "name": "pbiContainer",
                    "value": { "width": 800, "height": 600 }
                }
            ],
            "width": "container",
            "height": "container",
            "data": { "name": "dataset" },
            "mark": "bar",
            "encoding": {
                "x": {
                    "field": "category",
                    "type": "nominal"
                },
                "y": {
                    "field": "value",
                    "type": "quantitative"
                }
            }
        }`;

        const result = replaceLegacySignalReferences(spec);

        expect(result.hadLegacyReferences).toBe(true);
        expect(result.replacementCount).toBe(1);
        expect(result.spec).toContain(`"name": "${SIGNAL_DENEB_CONTAINER}"`);
        expect(result.spec).not.toContain(SIGNAL_PBI_CONTAINER_LEGACY);
    });

    it('should handle mixed case and preserve JSON structure', () => {
        const spec = `{
            "signals": [
                {
                    "name": "zoom",
                    "value": 1,
                    "on": [
                        {
                            "events": "wheel",
                            "update": "clamp(zoom * pow(1.001, -event.deltaY), 0.5, 3)"
                        }
                    ]
                },
                {
                    "name": "pbiContainer",
                    "value": { "width": 800, "height": 600 }
                }
            ]
        }`;

        const result = replaceLegacySignalReferences(spec);

        // Verify JSON structure is preserved
        expect(() => JSON.parse(result.spec)).not.toThrow();

        const parsed = JSON.parse(result.spec);
        expect(parsed.signals).toHaveLength(2);
        expect(parsed.signals[1].name).toBe(SIGNAL_DENEB_CONTAINER);
    });
});

describe('hasLegacySignalReferences', () => {
    it('should return true when legacy signal is present', () => {
        const spec = '{ "signals": [{ "name": "pbiContainer" }] }';
        expect(hasLegacySignalReferences(spec)).toBe(true);
    });

    it('should return true when pbiContainerWidth is present', () => {
        const spec = '{ "update": "pbiContainerWidth" }';
        expect(hasLegacySignalReferences(spec)).toBe(true);
    });

    it('should return true when pbiContainerHeight is present', () => {
        const spec = '{ "update": "pbiContainerHeight" }';
        expect(hasLegacySignalReferences(spec)).toBe(true);
    });

    it('should return false when legacy signal is not present', () => {
        const spec = '{ "signals": [{ "name": "denebContainer" }] }';
        expect(hasLegacySignalReferences(spec)).toBe(false);
    });

    it('should return false for empty string', () => {
        expect(hasLegacySignalReferences('')).toBe(false);
    });

    it('should detect legacy signal in complex spec', () => {
        const spec = `{
            "width": 800,
            "height": 600,
            "signals": [
                { "name": "customSignal", "value": 10 },
                { "name": "anotherSignal", "update": "pbiContainer.width" }
            ]
        }`;
        expect(hasLegacySignalReferences(spec)).toBe(true);
    });

    it('should not detect partial matches', () => {
        const spec = '{ "signals": [{ "name": "myPbiContainerCustom" }] }';
        expect(hasLegacySignalReferences(spec)).toBe(false);
    });
});

describe('Signal Migration Integration', () => {
    it('should produce idempotent results', () => {
        const spec = `{
            "width": { "signal": "pbiContainer.width" },
            "height": { "signal": "pbiContainer.height" }
        }`;

        const firstMigration = replaceLegacySignalReferences(spec);
        const secondMigration = replaceLegacySignalReferences(firstMigration.spec);

        expect(firstMigration.hadLegacyReferences).toBe(true);
        expect(secondMigration.hadLegacyReferences).toBe(false);
        expect(firstMigration.spec).toBe(secondMigration.spec);
    });

    it('should handle real-world template spec', () => {
        const templateSpec = `{
            "$schema": "https://vega.github.io/schema/vega/v5.json",
            "description": "Interactive bar chart with pbiContainer dimensions",
            "width": { "signal": "pbiContainer.width" },
            "height": { "signal": "pbiContainer.height" },
            "padding": 5,
            "signals": [
                {
                    "name": "pbiContainer",
                    "value": {
                        "width": 800,
                        "height": 600,
                        "scrollTop": 0,
                        "scrollLeft": 0
                    }
                },
                {
                    "name": "hover",
                    "value": null,
                    "on": [
                        { "events": "rect:mouseover", "update": "datum" },
                        { "events": "rect:mouseout", "update": "null" }
                    ]
                }
            ],
            "data": [
                {
                    "name": "dataset",
                    "values": []
                }
            ],
            "marks": [
                {
                    "type": "rect",
                    "from": { "data": "dataset" },
                    "encode": {
                        "update": {
                            "x": { "scale": "xscale", "field": "category" },
                            "width": {
                                "signal": "max(0.25, bandwidth('xscale'))"
                            },
                            "y": { "scale": "yscale", "field": "amount" },
                            "y2": { "scale": "yscale", "value": 0 }
                        }
                    }
                }
            ]
        }`;

        const result = replaceLegacySignalReferences(templateSpec);

        expect(result.hadLegacyReferences).toBe(true);
        expect(result.replacementCount).toBe(4); // pbiContainer appears 4 times (description + width + height + signal name)
        expect(result.spec).toContain(SIGNAL_DENEB_CONTAINER);
        expect(result.spec).not.toContain(SIGNAL_PBI_CONTAINER_LEGACY);

        // Verify it's still valid JSON
        expect(() => JSON.parse(result.spec)).not.toThrow();

        const parsed = JSON.parse(result.spec);
        expect(parsed.signals[0].name).toBe(SIGNAL_DENEB_CONTAINER);
    });
});
