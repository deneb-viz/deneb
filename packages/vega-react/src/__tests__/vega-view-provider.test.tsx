import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { View } from 'vega';
import { VegaViewProvider } from '../context/vega-view-provider';
import { useVegaView } from '../hooks/use-vega-view';

describe('VegaViewProvider', () => {
    it('should initialize with null view', () => {
        const { result } = renderHook(() => useVegaView(), {
            wrapper: VegaViewProvider
        });

        expect(result.current.view).toBeNull();
    });

    it('should update view when setView is called', () => {
        const { result } = renderHook(() => useVegaView(), {
            wrapper: VegaViewProvider
        });

        const mockView = {
            data: vi.fn(() => ['dataset1', 'dataset2']),
            signal: vi.fn(),
            getState: vi.fn(() => ({ signals: {} }))
        } as unknown as View;

        act(() => {
            result.current.setView(mockView);
        });

        expect(result.current.view).toBe(mockView);
    });

    it('should clear view when setView is called with null', () => {
        const { result } = renderHook(() => useVegaView(), {
            wrapper: VegaViewProvider
        });

        const mockView = {
            data: vi.fn(() => []),
            signal: vi.fn(),
            getState: vi.fn(() => ({ signals: {} }))
        } as unknown as View;

        // First set a view
        act(() => {
            result.current.setView(mockView);
        });

        expect(result.current.view).toBe(mockView);

        // Then clear it
        act(() => {
            result.current.setView(null);
        });

        expect(result.current.view).toBeNull();
    });

    it('should memoize context value properly', () => {
        const { result, rerender } = renderHook(() => useVegaView(), {
            wrapper: VegaViewProvider
        });

        const firstContextValue = result.current;

        // Rerender without changing anything
        rerender();

        // Context value should be the same reference
        expect(result.current).toBe(firstContextValue);
    });

    it('should update context value when view changes', () => {
        const { result } = renderHook(() => useVegaView(), {
            wrapper: VegaViewProvider
        });

        const firstContextValue = result.current;

        const mockView = {
            data: vi.fn(() => []),
            signal: vi.fn(),
            getState: vi.fn(() => ({ signals: {} }))
        } as unknown as View;

        act(() => {
            result.current.setView(mockView);
        });

        // Context value should be different reference after view change
        expect(result.current).not.toBe(firstContextValue);
        expect(result.current.view).toBe(mockView);
    });
});
