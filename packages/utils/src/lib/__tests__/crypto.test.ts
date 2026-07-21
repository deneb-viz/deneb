import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNewUuid } from '../crypto';

const UUID_REGEX =
    /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;

describe('getNewUuid', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('should return a valid UUID when crypto is available', () => {
        expect(getNewUuid()).toMatch(UUID_REGEX);
    });

    it('uses crypto.randomUUID when available', () => {
        const spy = vi
            .spyOn(crypto, 'randomUUID')
            .mockReturnValue('12345678-1234-4123-8123-123456789abc');
        expect(getNewUuid()).toBe('12345678-1234-4123-8123-123456789abc');
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('falls back to a valid v4-shaped UUID when crypto.randomUUID is unavailable', () => {
        vi.stubGlobal('crypto', {}); // host without randomUUID
        expect(getNewUuid()).toMatch(UUID_REGEX);
    });

    it('generates unique values across many calls', () => {
        const ids = new Set(Array.from({ length: 100 }, () => getNewUuid()));
        expect(ids.size).toBe(100);
    });
});
