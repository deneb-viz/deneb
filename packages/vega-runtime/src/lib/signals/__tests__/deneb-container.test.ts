import { describe, expect, it } from 'vitest';
import {
    getSignalDenebContainer,
    getDenebContainerSignalFromDimensions,
    getContainerSignalReferences,
    updateContainerInitDimensions,
    SIGNAL_DENEB_CONTAINER,
    SIGNAL_PBI_CONTAINER_LEGACY,
    type DenebContainerSignal,
    type ContainerDimensions
} from '../deneb-container';

describe('getSignalDenebContainer', () => {
    it('should return signal with correct name', () => {
        const signal = getSignalDenebContainer();

        expect(signal.name).toBe(SIGNAL_DENEB_CONTAINER);
        expect(signal.name).not.toBe(SIGNAL_PBI_CONTAINER_LEGACY);
    });

    it('should return zero values when no options provided', () => {
        const signal = getSignalDenebContainer();

        expect(signal.value).toEqual({
            height: 0,
            width: 0,
            scrollHeight: 0,
            scrollWidth: 0,
            scrollTop: 0,
            scrollLeft: 0
        });
    });

    it('should extract dimensions from container element', () => {
        const mockContainer = {
            clientHeight: 600,
            clientWidth: 800,
            scrollHeight: 1200,
            scrollWidth: 1600,
            scrollTop: 100,
            scrollLeft: 50
        } as HTMLElement;

        const signal = getSignalDenebContainer({ container: mockContainer });

        expect(signal.value).toEqual({
            height: 600,
            width: 800,
            scrollHeight: 1200,
            scrollWidth: 1600,
            scrollTop: 100,
            scrollLeft: 50
        });
    });

    it('should use scroll options when provided', () => {
        const signal = getSignalDenebContainer({
            scroll: {
                height: 400,
                width: 600,
                scrollHeight: 800,
                scrollWidth: 1200,
                scrollTop: 50,
                scrollLeft: 25
            }
        });

        expect(signal.value).toEqual({
            height: 400,
            width: 600,
            scrollHeight: 800,
            scrollWidth: 1200,
            scrollTop: 50,
            scrollLeft: 25
        });
    });

    it('should prioritize container over scroll options', () => {
        const mockContainer = {
            clientHeight: 600,
            clientWidth: 800,
            scrollHeight: 1200,
            scrollWidth: 1600,
            scrollTop: 100,
            scrollLeft: 50
        } as HTMLElement;

        const signal = getSignalDenebContainer({
            container: mockContainer,
            scroll: {
                height: 400,
                width: 600,
                scrollHeight: 800,
                scrollWidth: 1200,
                scrollTop: 50,
                scrollLeft: 25
            }
        });

        // Container values should win
        expect(signal.value).toEqual({
            height: 600,
            width: 800,
            scrollHeight: 1200,
            scrollWidth: 1600,
            scrollTop: 100,
            scrollLeft: 50
        });
    });

    it('should handle partial container dimensions', () => {
        const mockContainer = {
            clientHeight: 600,
            clientWidth: 800,
            scrollHeight: 0,
            scrollWidth: 0,
            scrollTop: 0,
            scrollLeft: 0
        } as HTMLElement;

        const signal = getSignalDenebContainer({ container: mockContainer });

        expect(signal.value.height).toBe(600);
        expect(signal.value.width).toBe(800);
        expect(signal.value.scrollHeight).toBe(0);
    });

    it('should handle partial scroll options', () => {
        const signal = getSignalDenebContainer({
            scroll: {
                height: 500,
                width: 700
                // scrollHeight, scrollWidth, scrollTop, scrollLeft omitted
            }
        });

        expect(signal.value.height).toBe(500);
        expect(signal.value.width).toBe(700);
        expect(signal.value.scrollHeight).toBe(0);
        expect(signal.value.scrollWidth).toBe(0);
        expect(signal.value.scrollTop).toBe(0);
        expect(signal.value.scrollLeft).toBe(0);
    });

    it('should handle undefined/null container properties gracefully', () => {
        const mockContainer = {
            clientHeight: undefined,
            clientWidth: null,
            scrollHeight: 1200,
            scrollWidth: 1600
        } as any;

        const signal = getSignalDenebContainer({ container: mockContainer });

        // Should fall back to 0 for undefined/null values
        expect(signal.value.height).toBe(0);
        expect(signal.value.width).toBe(0);
        expect(signal.value.scrollHeight).toBe(1200);
        expect(signal.value.scrollWidth).toBe(1600);
    });

    it('should return consistent structure across different inputs', () => {
        const signals = [
            getSignalDenebContainer(),
            getSignalDenebContainer({ scroll: { height: 100, width: 200 } }),
            getSignalDenebContainer({
                container: {
                    clientHeight: 300,
                    clientWidth: 400
                } as HTMLElement
            })
        ];

        signals.forEach((signal) => {
            expect(signal).toHaveProperty('name');
            expect(signal).toHaveProperty('value');
            expect(signal.value).toHaveProperty('height');
            expect(signal.value).toHaveProperty('width');
            expect(signal.value).toHaveProperty('scrollHeight');
            expect(signal.value).toHaveProperty('scrollWidth');
            expect(signal.value).toHaveProperty('scrollTop');
            expect(signal.value).toHaveProperty('scrollLeft');
        });
    });
});

describe('getContainerSignalReferences', () => {
    it('should return signal references using denebContainer', () => {
        const refs = getContainerSignalReferences();

        expect(refs.width).toBe('denebContainer.width');
        expect(refs.height).toBe('denebContainer.height');
        expect(refs.scrollWidth).toBe('denebContainer.scrollWidth');
        expect(refs.scrollHeight).toBe('denebContainer.scrollHeight');
        expect(refs.scrollTop).toBe('denebContainer.scrollTop');
        expect(refs.scrollLeft).toBe('denebContainer.scrollLeft');
    });

    it('should not include legacy signal name', () => {
        const refs = getContainerSignalReferences();

        Object.values(refs).forEach((ref) => {
            expect(ref).not.toContain('pbiContainer');
            expect(ref).toContain('denebContainer');
        });
    });

    it('should provide references for all signal properties', () => {
        const refs = getContainerSignalReferences();
        const expectedProperties = [
            'width',
            'height',
            'scrollWidth',
            'scrollHeight',
            'scrollTop',
            'scrollLeft'
        ];

        expectedProperties.forEach((prop) => {
            expect(refs).toHaveProperty(prop);
            expect(refs[prop as keyof typeof refs]).toBe(
                `denebContainer.${prop}`
            );
        });
    });
});

describe('Signal Integration', () => {
    it('should create signal compatible with Vega spec patching', () => {
        const signal = getSignalDenebContainer({
            scroll: { height: 600, width: 800 }
        });

        const vegaSignal = {
            name: signal.name,
            value: signal.value
        };

        // Should be compatible with Vega signal format
        expect(vegaSignal).toHaveProperty('name');
        expect(vegaSignal).toHaveProperty('value');
        expect(typeof vegaSignal.name).toBe('string');
        expect(typeof vegaSignal.value).toBe('object');
    });

    it('should provide values suitable for signal expressions', () => {
        const signal = getSignalDenebContainer({
            container: {
                clientHeight: 600,
                clientWidth: 800,
                scrollHeight: 1200,
                scrollWidth: 1600,
                scrollTop: 100,
                scrollLeft: 50
            } as HTMLElement
        });

        // All values should be numeric for use in Vega expressions
        Object.values(signal.value).forEach((value) => {
            expect(typeof value).toBe('number');
            expect(Number.isFinite(value)).toBe(true);
        });
    });
});

describe('Constants', () => {
    it('should export correct signal names', () => {
        expect(SIGNAL_DENEB_CONTAINER).toBe('denebContainer');
        expect(SIGNAL_PBI_CONTAINER_LEGACY).toBe('pbiContainer');
    });

    it('should have different names for legacy and modern signals', () => {
        expect(SIGNAL_DENEB_CONTAINER).not.toBe(SIGNAL_PBI_CONTAINER_LEGACY);
    });
});

describe('Type Safety', () => {
    it('should enforce DenebContainerSignal interface', () => {
        const signal = getSignalDenebContainer();
        const value: DenebContainerSignal = signal.value;

        // TypeScript should enforce these properties exist
        const _height: number = value.height;
        const _width: number = value.width;
        const _scrollHeight: number = value.scrollHeight;
        const _scrollWidth: number = value.scrollWidth;
        const _scrollTop: number = value.scrollTop;
        const _scrollLeft: number = value.scrollLeft;

        // If we got here without compile errors, type safety is working
        expect(true).toBe(true);
    });
});

describe('getDenebContainerSignalFromDimensions', () => {
    it('should return signal with correct name', () => {
        const signal = getDenebContainerSignalFromDimensions({
            width: 800,
            height: 600
        });

        expect(signal.name).toBe(SIGNAL_DENEB_CONTAINER);
    });

    it('should return zero values when no dimensions provided', () => {
        const signal = getDenebContainerSignalFromDimensions();

        expect(signal.value).toEqual({
            height: 0,
            width: 0,
            scrollHeight: 0,
            scrollWidth: 0,
            scrollTop: 0,
            scrollLeft: 0
        });
    });

    it('should return zero values when undefined is passed', () => {
        const signal = getDenebContainerSignalFromDimensions(undefined);

        expect(signal.value).toEqual({
            height: 0,
            width: 0,
            scrollHeight: 0,
            scrollWidth: 0,
            scrollTop: 0,
            scrollLeft: 0
        });
    });

    it('should set width and height from dimensions', () => {
        const dimensions: ContainerDimensions = { width: 800, height: 600 };
        const signal = getDenebContainerSignalFromDimensions(dimensions);

        expect(signal.value.width).toBe(800);
        expect(signal.value.height).toBe(600);
    });

    it('should set scroll-related values to zero', () => {
        const signal = getDenebContainerSignalFromDimensions({
            width: 800,
            height: 600
        });

        expect(signal.value.scrollHeight).toBe(0);
        expect(signal.value.scrollWidth).toBe(0);
        expect(signal.value.scrollTop).toBe(0);
        expect(signal.value.scrollLeft).toBe(0);
    });

    it('should produce same result as getSignalDenebContainer with scroll option', () => {
        const dimensions: ContainerDimensions = { width: 1024, height: 768 };

        const fromDimensions =
            getDenebContainerSignalFromDimensions(dimensions);
        const fromScrollOption = getSignalDenebContainer({
            scroll: { width: 1024, height: 768 }
        });

        expect(fromDimensions).toEqual(fromScrollOption);
    });

    it('should handle zero dimensions', () => {
        const signal = getDenebContainerSignalFromDimensions({
            width: 0,
            height: 0
        });

        expect(signal.value.width).toBe(0);
        expect(signal.value.height).toBe(0);
    });

    it('should return consistent structure for spec patching', () => {
        const signal = getDenebContainerSignalFromDimensions({
            width: 800,
            height: 600
        });

        // Should be compatible with both Vega signals and Vega-Lite params
        expect(signal).toHaveProperty('name');
        expect(signal).toHaveProperty('value');
        expect(typeof signal.name).toBe('string');
        expect(typeof signal.value).toBe('object');
    });

    it('should provide numeric values suitable for signal expressions', () => {
        const signal = getDenebContainerSignalFromDimensions({
            width: 800,
            height: 600
        });

        Object.values(signal.value).forEach((value) => {
            expect(typeof value).toBe('number');
            expect(Number.isFinite(value)).toBe(true);
        });
    });
});

describe('updateContainerInitDimensions', () => {
    const originalDenebContainerValue = {
        width: 541,
        height: 352,
        scrollWidth: 541,
        scrollHeight: 352,
        scrollTop: 0,
        scrollLeft: 0
    };
    const newDimensions: ContainerDimensions = { width: 855, height: 466 };

    it('should rewrite only width/height for a Vega (signals) spec, preserving other fields, other signals, and not mutating the input', () => {
        const otherSignal = { name: 'someOtherSignal', value: 42 };
        const denebContainerSignal = {
            name: SIGNAL_DENEB_CONTAINER,
            value: { ...originalDenebContainerValue }
        };
        const spec = {
            signals: [otherSignal, denebContainerSignal]
        };

        const result = updateContainerInitDimensions(spec, newDimensions);

        expect(result).not.toBe(spec);
        expect(result.signals).not.toBe(spec.signals);

        const updatedEntry = result.signals?.find(
            (s) => s.name === SIGNAL_DENEB_CONTAINER
        );
        expect(updatedEntry?.value).toEqual({
            width: 855,
            height: 466,
            scrollWidth: 541,
            scrollHeight: 352,
            scrollTop: 0,
            scrollLeft: 0
        });

        // Other signals are the SAME reference (untouched)
        const untouchedEntry = result.signals?.find(
            (s) => s.name === 'someOtherSignal'
        );
        expect(untouchedEntry).toBe(otherSignal);

        // Input spec is not mutated
        expect(spec.signals[1].value).toEqual(originalDenebContainerValue);
    });

    it('should rewrite only width/height for a Vega-Lite (params) spec', () => {
        const otherParam = { name: 'someOtherParam', value: 'foo' };
        const denebContainerParam = {
            name: SIGNAL_DENEB_CONTAINER,
            value: { ...originalDenebContainerValue }
        };
        const spec = {
            params: [otherParam, denebContainerParam]
        };

        const result = updateContainerInitDimensions(spec, newDimensions);

        expect(result).not.toBe(spec);
        expect(result.params).not.toBe(spec.params);

        const updatedEntry = result.params?.find(
            (p) => p.name === SIGNAL_DENEB_CONTAINER
        );
        expect(updatedEntry?.value).toEqual({
            width: 855,
            height: 466,
            scrollWidth: 541,
            scrollHeight: 352,
            scrollTop: 0,
            scrollLeft: 0
        });

        const untouchedEntry = result.params?.find(
            (p) => p.name === 'someOtherParam'
        );
        expect(untouchedEntry).toBe(otherParam);

        expect(spec.params[1].value).toEqual(originalDenebContainerValue);
    });

    it('should return the input reference unchanged when there is no denebContainer entry', () => {
        const spec = {
            signals: [{ name: 'someOtherSignal', value: 42 }]
        };

        const result = updateContainerInitDimensions(spec, newDimensions);

        expect(result).toBe(spec);
    });

    it('should return the input reference unchanged when there are no signals/params at all', () => {
        const spec = {};

        const result = updateContainerInitDimensions(spec, newDimensions);

        expect(result).toBe(spec);
    });

    it('should return the input reference unchanged when dims already match (identity-stable no-op)', () => {
        const spec = {
            signals: [
                {
                    name: SIGNAL_DENEB_CONTAINER,
                    value: { ...originalDenebContainerValue }
                }
            ]
        };

        const result = updateContainerInitDimensions(spec, {
            width: originalDenebContainerValue.width,
            height: originalDenebContainerValue.height
        });

        expect(result).toBe(spec);
    });

    it('should return the input reference unchanged when the denebContainer value is not a plain object', () => {
        const spec = {
            signals: [{ name: SIGNAL_DENEB_CONTAINER, value: 'not-an-object' }]
        };

        const result = updateContainerInitDimensions(spec, newDimensions);

        expect(result).toBe(spec);
    });
});
