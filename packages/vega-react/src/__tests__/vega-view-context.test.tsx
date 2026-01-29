import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { VegaViewProvider } from '../context/vega-view-provider';
import { useVegaView } from '../hooks/use-vega-view';

describe('VegaViewContext', () => {
    it('should throw error when useVegaView is used outside provider', () => {
        // Suppress console.error for this test
        const originalError = console.error;
        console.error = vi.fn();

        expect(() => {
            renderHook(() => useVegaView());
        }).toThrow('useVegaView must be used within VegaViewProvider');

        console.error = originalError;
    });

    it('should provide context value when used within provider', () => {
        const { result } = renderHook(() => useVegaView(), {
            wrapper: VegaViewProvider
        });

        expect(result.current).toBeDefined();
        expect(result.current.view).toBeNull();
        expect(result.current.setView).toBeInstanceOf(Function);
    });
});
