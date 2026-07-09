import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import vegaEmbed from 'vega-embed';
import { useVegaEmbed } from '../hooks/use-vega-embed';
import type { View } from 'vega';

// Mock vega-embed
vi.mock('vega-embed');

/**
 * A promise whose settlement is driven by the test, so we can control the
 * order in which concurrent `vegaEmbed()` calls resolve/reject.
 */
function createDeferred<T = unknown>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

/**
 * Build a distinct fake embed result (its own view + finalize spy) so a test
 * can assert exactly which embed's view was published or finalized.
 */
function makeResult(name: string) {
    const view = { runAsync: vi.fn().mockResolvedValue(undefined) } as unknown as View;
    const finalize = vi.fn();
    const result = { view, vgSpec: { name }, finalize, spec: {} } as any;
    return { view, finalize, result };
}

/** Let queued promise callbacks (the embed `.then`/`.catch`) run. */
const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

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

    it('should finalize previous embed when ref.current becomes null while spec stays set', async () => {
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
        await flushMicrotasks();

        // Container removed from the tree, but a (new) spec is still present so
        // the effect re-runs and must release the orphaned embed.
        mockRef.current = null;
        rerender({
            spec: { ...spec, description: 'respec' } as any
        });

        expect(mockFinalize).toHaveBeenCalledTimes(1);
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

    it('never patches console.warn during or after concurrent embeds', async () => {
        // The console.warn capture apparatus was removed: it had no consumer
        // and its restore was not overlap-safe (two concurrent embeds could
        // leave the patch installed permanently). console.warn identity must
        // therefore be stable before, during, and after embedding - including
        // while two embeds overlap in flight.
        const originalWarn = console.warn;
        const specA = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 1
        };
        const specB = {
            $schema: 'https://vega.github.io/schema/vega/v5.json',
            width: 2
        };

        // Keep both embeds pending so a monkey-patch would still be installed.
        const deferredA = createDeferred();
        const deferredB = createDeferred();
        vi.mocked(vegaEmbed)
            .mockReturnValueOnce(deferredA.promise as any)
            .mockReturnValueOnce(deferredB.promise as any);

        const { rerender } = renderHook(
            ({ spec }) => useVegaEmbed({ ref: mockRef, spec, options: {} }),
            { initialProps: { spec: specA } }
        );

        // First embed in flight.
        expect(console.warn).toBe(originalWarn);

        // Second embed overlaps the first in flight.
        rerender({ spec: specB });
        expect(console.warn).toBe(originalWarn);

        await vi.waitFor(() => expect(vegaEmbed).toHaveBeenCalledTimes(2));
        expect(console.warn).toBe(originalWarn);

        // Settle both; identity must remain the native reference throughout.
        deferredB.resolve(makeResult('B').result);
        deferredA.resolve(makeResult('A').result);
        await flushMicrotasks();

        expect(console.warn).toBe(originalWarn);
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

    describe('stale embed generation guard (H1)', () => {
        it('finalizes a stale embed that resolves after a newer embed, retaining only the newer result', async () => {
            // Embed A (older) is superseded by embed B (newer) via a respec,
            // then A resolves LAST. A must finalize itself and never publish;
            // B must remain the live, retained result.
            const a = makeResult('A');
            const b = makeResult('B');
            const deferredA = createDeferred();
            const deferredB = createDeferred();
            vi.mocked(vegaEmbed)
                .mockReturnValueOnce(deferredA.promise as any)
                .mockReturnValueOnce(deferredB.promise as any);

            const onEmbed = vi.fn();
            const specA = {
                $schema: 'https://vega.github.io/schema/vega/v5.json',
                width: 1
            };
            const specB = {
                $schema: 'https://vega.github.io/schema/vega/v5.json',
                width: 2
            };

            const { rerender } = renderHook(
                ({ spec }) =>
                    useVegaEmbed({ ref: mockRef, spec, options: {}, onEmbed }),
                { initialProps: { spec: specA } }
            );
            await vi.waitFor(() =>
                expect(vegaEmbed).toHaveBeenCalledTimes(1)
            );

            rerender({ spec: specB });
            await vi.waitFor(() =>
                expect(vegaEmbed).toHaveBeenCalledTimes(2)
            );

            // Newer embed (B) settles first and is published.
            deferredB.resolve(b.result);
            await vi.waitFor(() => expect(onEmbed).toHaveBeenCalledTimes(1));
            expect(onEmbed).toHaveBeenCalledWith({
                view: b.view,
                vgSpec: { name: 'B' }
            });

            // Older embed (A) settles later - stale, so it finalizes itself.
            deferredA.resolve(a.result);
            await flushMicrotasks();

            expect(a.finalize).toHaveBeenCalledTimes(1);
            expect(b.finalize).not.toHaveBeenCalled();
            expect(onEmbed).toHaveBeenCalledTimes(1);
            expect(onEmbed).not.toHaveBeenCalledWith({
                view: a.view,
                vgSpec: { name: 'A' }
            });
        });

        it('finalizes an in-flight embed that resolves after unmount without firing callbacks', async () => {
            // Unmount while an embed is still pending; its later resolution
            // must finalize the orphaned view and perform no callback/state
            // write (no onEmbed, no onError).
            const r = makeResult('A');
            const deferred = createDeferred();
            vi.mocked(vegaEmbed).mockReturnValueOnce(deferred.promise as any);

            const onEmbed = vi.fn();
            const onError = vi.fn();
            const spec = { $schema: 'https://vega.github.io/schema/vega/v5.json' };

            const { unmount } = renderHook(() =>
                useVegaEmbed({
                    ref: mockRef,
                    spec,
                    options: {},
                    onEmbed,
                    onError
                })
            );
            await vi.waitFor(() =>
                expect(vegaEmbed).toHaveBeenCalledTimes(1)
            );

            unmount();
            deferred.resolve(r.result);
            await flushMicrotasks();

            expect(r.finalize).toHaveBeenCalledTimes(1);
            expect(onEmbed).not.toHaveBeenCalled();
            expect(onError).not.toHaveBeenCalled();
        });

        it('keeps exactly one live view after a rapid triple respec and finalizes both stale results', async () => {
            const a = makeResult('A');
            const b = makeResult('B');
            const c = makeResult('C');
            const deferredA = createDeferred();
            const deferredB = createDeferred();
            const deferredC = createDeferred();
            vi.mocked(vegaEmbed)
                .mockReturnValueOnce(deferredA.promise as any)
                .mockReturnValueOnce(deferredB.promise as any)
                .mockReturnValueOnce(deferredC.promise as any);

            const onEmbed = vi.fn();
            const specFor = (width: number) => ({
                $schema: 'https://vega.github.io/schema/vega/v5.json',
                width
            });

            const { rerender } = renderHook(
                ({ spec }) =>
                    useVegaEmbed({ ref: mockRef, spec, options: {}, onEmbed }),
                { initialProps: { spec: specFor(1) } }
            );
            await vi.waitFor(() =>
                expect(vegaEmbed).toHaveBeenCalledTimes(1)
            );
            rerender({ spec: specFor(2) });
            await vi.waitFor(() =>
                expect(vegaEmbed).toHaveBeenCalledTimes(2)
            );
            rerender({ spec: specFor(3) });
            await vi.waitFor(() =>
                expect(vegaEmbed).toHaveBeenCalledTimes(3)
            );

            // Settle out of order; only the final generation (C) is live.
            deferredA.resolve(a.result);
            deferredB.resolve(b.result);
            deferredC.resolve(c.result);
            await flushMicrotasks();

            expect(a.finalize).toHaveBeenCalledTimes(1);
            expect(b.finalize).toHaveBeenCalledTimes(1);
            expect(c.finalize).not.toHaveBeenCalled();
            expect(onEmbed).toHaveBeenCalledTimes(1);
            expect(onEmbed).toHaveBeenCalledWith({
                view: c.view,
                vgSpec: { name: 'C' }
            });
        });

        it('does not fire onError for a stale embed that rejects after a newer embed resolves', async () => {
            const b = makeResult('B');
            const deferredA = createDeferred();
            const deferredB = createDeferred();
            vi.mocked(vegaEmbed)
                .mockReturnValueOnce(deferredA.promise as any)
                .mockReturnValueOnce(deferredB.promise as any);

            const onEmbed = vi.fn();
            const onError = vi.fn();
            const specA = {
                $schema: 'https://vega.github.io/schema/vega/v5.json',
                width: 1
            };
            const specB = {
                $schema: 'https://vega.github.io/schema/vega/v5.json',
                width: 2
            };

            const { rerender } = renderHook(
                ({ spec }) =>
                    useVegaEmbed({
                        ref: mockRef,
                        spec,
                        options: {},
                        onEmbed,
                        onError
                    }),
                { initialProps: { spec: specA } }
            );
            await vi.waitFor(() =>
                expect(vegaEmbed).toHaveBeenCalledTimes(1)
            );
            rerender({ spec: specB });
            await vi.waitFor(() =>
                expect(vegaEmbed).toHaveBeenCalledTimes(2)
            );

            // Live embed (B) resolves and publishes.
            deferredB.resolve(b.result);
            await vi.waitFor(() => expect(onEmbed).toHaveBeenCalledTimes(1));

            // Stale embed (A) rejects afterwards - its error must be swallowed.
            deferredA.reject(new Error('stale embed failed'));
            await flushMicrotasks();

            expect(onError).not.toHaveBeenCalled();
        });
    });
});
