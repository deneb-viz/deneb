import '@testing-library/jest-dom/vitest';

// Mock vega-embed to avoid actual rendering in tests
vi.mock('vega-embed', () => ({
    default: vi.fn()
}));
