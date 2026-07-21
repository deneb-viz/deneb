import { describe, expect, it } from 'vitest';

import {
    PLATFORM_SECTION_KEYS,
    platformSearchContributions
} from '../platform-search-contributions';

/**
 * Parity tests between `PLATFORM_SECTION_KEYS` (the React keys used in
 * `app.tsx` for `settingsPanePlatformComponent`) and
 * `platformSearchContributions` (the `PlatformSearchContribution` objects
 * used to build the settings-pane search index).
 *
 * The pane correlates rendered sections with their searchable descriptors
 * by `id === element.key`. A typo or silent drift in either list produces
 * a "section never filters" bug with no runtime signal; this test locks
 * the two lists to a single source of truth and the same ordering.
 */
describe('platform-search-contributions parity', () => {
    it('every PLATFORM_SECTION_KEYS entry has a matching contribution id at the same index', () => {
        PLATFORM_SECTION_KEYS.forEach((key, index) => {
            expect(platformSearchContributions[index]?.id).toBe(key);
        });
    });

    it('lengths match — no orphan contributions, no unregistered keys', () => {
        expect(platformSearchContributions).toHaveLength(
            PLATFORM_SECTION_KEYS.length
        );
    });

    it('ordering of PLATFORM_SECTION_KEYS matches ordering of contributions (1:1 mapping)', () => {
        const contributionIds = platformSearchContributions.map((c) => c.id);
        expect(contributionIds).toEqual([...PLATFORM_SECTION_KEYS]);
    });

    it('every contribution id is a known PLATFORM_SECTION_KEYS entry (no orphans)', () => {
        const keySet = new Set<string>(PLATFORM_SECTION_KEYS);
        for (const contribution of platformSearchContributions) {
            expect(keySet.has(contribution.id)).toBe(true);
        }
    });

    it('every contribution has at least one row (sanity — zero-row sections are silently filtered at resolve time)', () => {
        for (const contribution of platformSearchContributions) {
            expect(contribution.rows.length).toBeGreaterThan(0);
        }
    });
});
