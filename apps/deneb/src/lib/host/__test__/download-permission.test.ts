import { describe, expect, it, vi } from 'vitest';

// Mock the logging gateway so the test doesn't pull the extensionless
// powerbi-visuals-utils ESM that CI's Node 22 rejects (handoff fact #10).
vi.mock('@deneb-viz/utils/logging', () => ({
    logError: vi.fn()
}));

import { resolveDownloadPermitted } from '../download-permission';

// Stand-in for powerbi.PrivilegeStatus.Allowed (a numeric enum member).
const ALLOWED = 0;

describe('resolveDownloadPermitted (L1 — download permission deny-by-default)', () => {
    it('resolves true when the host reports the allowed status', async () => {
        await expect(
            resolveDownloadPermitted(() => Promise.resolve(ALLOWED), ALLOWED)
        ).resolves.toBe(true);
    });

    it('resolves false when the host reports a non-allowed status', async () => {
        await expect(
            resolveDownloadPermitted(() => Promise.resolve(1), ALLOWED)
        ).resolves.toBe(false);
    });

    it('denies by default (false) when exportStatus rejects', async () => {
        await expect(
            resolveDownloadPermitted(
                () => Promise.reject(new Error('host error')),
                ALLOWED
            )
        ).resolves.toBe(false);
    });
});
