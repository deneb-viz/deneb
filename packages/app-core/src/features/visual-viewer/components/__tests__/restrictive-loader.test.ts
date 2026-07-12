import { describe, expect, it } from 'vitest';
import { getRestrictiveVegaLoader } from '../restrictive-loader';

describe('getRestrictiveVegaLoader (L9 — fail-closed default loader)', () => {
    it('blocks external content loads (resolves to empty)', async () => {
        const loader = getRestrictiveVegaLoader();
        await expect(
            loader.load('https://example.com/data.json')
        ).resolves.toBe('');
    });

    it('rejects sanitize for external (non-data) URIs', async () => {
        const loader = getRestrictiveVegaLoader();
        await expect(
            loader.sanitize('https://example.com/x.png', {})
        ).rejects.toEqual({ href: 'https://example.com/x.png' });
    });

    it('permits inline data: URIs through sanitize', async () => {
        const loader = getRestrictiveVegaLoader();
        const dataUri = 'data:image/png;base64,AAAA';
        await expect(loader.sanitize(dataUri, {})).resolves.toEqual({
            href: dataUri
        });
    });
});
