import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { VegaViewProvider } from '../context/vega-view-provider';
import { useVegaView } from '../hooks/use-vega-view';

describe('useVegaView', () => {
    it('should throw error when used outside VegaViewProvider', () => {
        // Suppress console.error for this test
        const originalError = console.error;
        console.error = vi.fn();

        expect(() => {
            renderHook(() => useVegaView());
        }).toThrow('useVegaView must be used within VegaViewProvider');

        console.error = originalError;
    });

    it('should return context value when used within VegaViewProvider', () => {
        const { result } = renderHook(() => useVegaView(), {
            wrapper: VegaViewProvider
        });

        expect(result.current).toBeDefined();
        expect(result.current).toHaveProperty('view');
        expect(result.current).toHaveProperty('setView');
    });

    it('should have correct initial values', () => {
        const { result } = renderHook(() => useVegaView(), {
            wrapper: VegaViewProvider
        });

        expect(result.current.view).toBeNull();
    });

    it('should provide stable function references', () => {
        const { result, rerender } = renderHook(() => useVegaView(), {
            wrapper: VegaViewProvider
        });

        const firstSetView = result.current.setView;

        // Rerender
        rerender();

        // Function should have the same reference
        expect(result.current.setView).toBe(firstSetView);
    });
});
