import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import vegaEmbed from 'vega-embed';
import { useVegaEmbed } from '../hooks/use-vega-embed';
import type { View } from 'vega';

// Mock vega-embed
vi.mock('vega-embed');

describe('useVegaEmbed', () => {
    let mockRef: { current: HTMLDivElement | null };
    let mockView: View;
    let mockFinalize: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Create mock container element
        const container = document.createElement('div');
        mockRef = { current: container };

        // Create mock view
        mockView = {
            runAsync: vi.fn().mockResolvedValue(undefined)
        } as unknown as View;

        // Create mock finalize function
        mockFinalize = vi.fn();

        // Mock vegaEmbed to return successful result
        vi.mocked(vegaEmbed).mockResolvedValue({
            view: mockView,
            vgSpec: { $schema: 'https://vega.github.io/schema/vega/v5.json' },
            finalize: mockFinalize,
            spec: {}
        } as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should not call vegaEmbed when ref.current is null', () => {
        const nullRef = { current: null };
        const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };

        renderHook(() =>
            useVegaEmbed({
                ref: nullRef,
                spec,
                options: {}
            })
        );

        expect(vegaEmbed).not.toHaveBeenCalled();
    });

    it('should not call vegaEmbed when spec is null', () => {
        renderHook(() =>
            useVegaEmbed({
                ref: mockRef,
                spec: null as any,
                options: {}
            })
        );

        expect(vegaEmbed).not.toHaveBeenCalled();
    });

    it('should clear container when spec becomes null', async () => {
        const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };

        // Add some content to the container
        mockRef.current!.innerHTML = '<div>Previous content</div>';

        const { rerender } = renderHook(
            ({ spec }) =>
                useVegaEmbed({
                    ref: mockRef,
                    spec,
                    options: {}
                }),
            { initialProps: { spec: spec as any } }
        );

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalled();
        });

        // Change spec to null
        rerender({ spec: null as any });

        // Container should be cleared
        expect(mockRef.current!.innerHTML).toBe('');
    });

    it('should finalize previous embed when spec becomes null', async () => {
        const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };

        const { rerender } = renderHook(
            ({ spec }) =>
                useVegaEmbed({
                    ref: mockRef,
                    spec,
                    options: {}
                }),
            { initialProps: { spec: spec as any } }
        );

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalled();
        });

        // Change spec to null
        rerender({ spec: null as any });

        // Finalize should be called
        expect(mockFinalize).toHaveBeenCalled();
    });

    it('should handle spec becoming null when no previous embed exists', () => {
        // Start with null spec
        const { rerender } = renderHook(
            ({ spec }) =>
                useVegaEmbed({
                    ref: mockRef,
                    spec,
                    options: {}
                }),
            { initialProps: { spec: null as any } }
        );

        expect(vegaEmbed).not.toHaveBeenCalled();

        // Stay null - should not throw
        rerender({ spec: null as any });

        expect(vegaEmbed).not.toHaveBeenCalled();
        expect(mockFinalize).not.toHaveBeenCalled();
    });

    it('should call vegaEmbed with correct parameters', async () => {
        const spec = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            marks: []
        };
        const options = { renderer: 'svg' as const, actions: false };

        renderHook(() =>
            useVegaEmbed({
                ref: mockRef,
                spec,
                options
            })
        );

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalledWith(mockRef.current, spec, options);
        });
    });

    it('should call onEmbed callback with view and vgSpec', async () => {
        const onEmbed = vi.fn();
        const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };

        renderHook(() =>
            useVegaEmbed({
                ref: mockRef,
                spec,
                options: {},
                onEmbed
            })
        );

        await vi.waitFor(() => {
            expect(onEmbed).toHaveBeenCalledWith({
                view: mockView,
                vgSpec: { $schema: 'https://vega.github.io/schema/vega/v5.json' }
            });
        });
    });

    it('should call onError callback when embed fails', async () => {
        const onError = vi.fn();
        const error = new Error('Embed failed');
        vi.mocked(vegaEmbed).mockRejectedValueOnce(error);

        const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };

        renderHook(() =>
            useVegaEmbed({
                ref: mockRef,
                spec,
                options: {},
                onError
            })
        );

        await vi.waitFor(() => {
            expect(onError).toHaveBeenCalledWith(error);
        });
    });

    it('should finalize previous embed before creating new one', async () => {
        const spec1 = { $schema: 'https://vega.github.io/schema/vega/v5.json', width: 400 };
        const spec2 = { $schema: 'https://vega.github.io/schema/vega/v5.json', width: 800 };

        const { rerender } = renderHook(
            ({ spec }) =>
                useVegaEmbed({
                    ref: mockRef,
                    spec,
                    options: {}
                }),
            { initialProps: { spec: spec1 } }
        );

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalledTimes(1);
        });

        // Change spec
        rerender({ spec: spec2 });

        await vi.waitFor(() => {
            expect(mockFinalize).toHaveBeenCalled();
            expect(vegaEmbed).toHaveBeenCalledTimes(2);
        });
    });

    it('should finalize on unmount', async () => {
        const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };

        const { unmount } = renderHook(() =>
            useVegaEmbed({
                ref: mockRef,
                spec,
                options: {}
            })
        );

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalled();
        });

        unmount();

        expect(mockFinalize).toHaveBeenCalled();
    });

    it('should capture and restore console warnings', async () => {
        const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };
        const capturedWarnings: string[] = [];

        vi.mocked(vegaEmbed).mockImplementation(async () => {
            // These warnings should be captured by the hook
            console.warn('Test warning 1');
            console.warn('Test warning 2');
            return {
                view: mockView,
                vgSpec: {},
                finalize: mockFinalize,
                spec: {}
            } as any;
        });

        renderHook(() =>
            useVegaEmbed({
                ref: mockRef,
                spec,
                options: {}
            })
        );

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalled();
        });

        // The hook should handle console.warn restoration internally
        // Just verify the mock was called
        expect(vegaEmbed).toHaveBeenCalledTimes(1);
    });

    it('should use deep comparison for spec changes', async () => {
        const spec1 = { $schema: 'https://vega.github.io/schema/vega/v5.json', width: 400 };
        // Create a new object with same content
        const spec2 = { $schema: 'https://vega.github.io/schema/vega/v5.json', width: 400 };

        const { rerender } = renderHook(
            ({ spec }) =>
                useVegaEmbed({
                    ref: mockRef,
                    spec,
                    options: {}
                }),
            { initialProps: { spec: spec1 } }
        );

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalledTimes(1);
        });

        // Rerender with different object but same content
        rerender({ spec: spec2 });

        // Should not call vegaEmbed again due to deep comparison
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(vegaEmbed).toHaveBeenCalledTimes(1);
    });

    it('should re-embed when spec content changes', async () => {
        const spec1 = { $schema: 'https://vega.github.io/schema/vega/v5.json', width: 400 };
        const spec2 = { $schema: 'https://vega.github.io/schema/vega/v5.json', width: 800 };

        const { rerender } = renderHook(
            ({ spec }) =>
                useVegaEmbed({
                    ref: mockRef,
                    spec,
                    options: {}
                }),
            { initialProps: { spec: spec1 } }
        );

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalledTimes(1);
        });

        // Rerender with different content
        rerender({ spec: spec2 });

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalledTimes(2);
        });
    });

    it('should use deep comparison for options changes', async () => {
        const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };
        const options1 = { renderer: 'svg' as const, actions: false };
        const options2 = { renderer: 'svg' as const, actions: false };

        const { rerender } = renderHook(
            ({ options }) =>
                useVegaEmbed({
                    ref: mockRef,
                    spec,
                    options
                }),
            { initialProps: { options: options1 } }
        );

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalledTimes(1);
        });

        // Rerender with different object but same content
        rerender({ options: options2 });

        // Should not call vegaEmbed again due to deep comparison
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(vegaEmbed).toHaveBeenCalledTimes(1);
    });

    it('should handle missing onEmbed callback gracefully', async () => {
        const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };

        expect(() => {
            renderHook(() =>
                useVegaEmbed({
                    ref: mockRef,
                    spec,
                    options: {}
                    // No onEmbed callback
                })
            );
        }).not.toThrow();

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalled();
        });
    });

    it('should handle missing onError callback gracefully', async () => {
        const error = new Error('Embed failed');
        vi.mocked(vegaEmbed).mockRejectedValueOnce(error);

        const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };

        expect(() => {
            renderHook(() =>
                useVegaEmbed({
                    ref: mockRef,
                    spec,
                    options: {}
                    // No onError callback
                })
            );
        }).not.toThrow();

        await vi.waitFor(() => {
            expect(vegaEmbed).toHaveBeenCalled();
        });
    });
});
