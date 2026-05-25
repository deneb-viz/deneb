import { describe, expect, it, vi } from 'vitest';

/**
 * Mock React's `useContext` so we can exercise the hook's guard in the
 * `node` test environment (no `@testing-library/react` available).
 * Each test sets the return value the mock should yield, then calls
 * the hook directly.
 */
vi.mock('react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react')>();
    return { ...actual, useContext: vi.fn() };
});

import { useContext } from 'react';
import { useSpecificationEditor } from '../use-specification-editor';

const mockedUseContext = vi.mocked(useContext);

describe('useSpecificationEditor', () => {
    it('throws with the documented message when called outside SpecificationEditorProvider', () => {
        // Reproduces the post-fix behaviour: with the context default
        // set to `null` (was `{} as SpecificationEditorRefs`), the
        // guard now fires correctly. Pre-fix this test would have
        // returned `{}` and never thrown.
        mockedUseContext.mockReturnValueOnce(null);
        expect(() => useSpecificationEditor()).toThrow(
            'useSpecificationEditor must be used within a SpecificationEditorProvider'
        );
    });

    it('returns the refs unchanged when the Provider supplied a value', () => {
        const refs = {
            spec: { current: null },
            config: { current: null }
        };
        mockedUseContext.mockReturnValueOnce(refs);
        expect(useSpecificationEditor()).toBe(refs);
    });
});
