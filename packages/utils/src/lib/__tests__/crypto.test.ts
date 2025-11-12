import { describe, expect, it } from 'vitest';
import { getNewUuid } from '../crypto';

const UUID_REGEX =
    /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;

describe('getNewUuid', () => {
    it('should return a valid UUID when crypto is available', () => {
        const uuid = getNewUuid();
        expect(uuid).toMatch(UUID_REGEX);
    });
    it('should return a valid UUID ', () => {
        const uuid = getNewUuid();
        expect(uuid).toMatch(UUID_REGEX);
        global.crypto = crypto;
    });
});
