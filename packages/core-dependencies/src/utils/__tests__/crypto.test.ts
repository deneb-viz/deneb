import { getFallbackUUid, getNewUuid, getRandomUuidSegment } from '../crypto';

const UUID_REGEX =
    /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;

describe('getRandomUuidString', () => {
    it('should return a valid UUID', () => {
        const uuid = getRandomUuidSegment();
        const uuidRegex = /^[0-9a-f]{16}$/i;
        expect(uuid).toMatch(uuidRegex);
    });
});

describe('getFallbackUUid', () => {
    it('should return a valid UUID', () => {
        const uuid = getFallbackUUid();
        expect(uuid).toMatch(UUID_REGEX);
    });
});

describe('getNewUuid', () => {
    it('should return a valid UUID when crypto is available', () => {
        const uuid = getNewUuid();
        expect(uuid).toMatch(UUID_REGEX);
    });
    it('should return a valid UUID when the crypto API is not available', () => {
        const crypto = global.crypto;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (global as any).crypto;
        const uuid = getNewUuid();
        expect(uuid).toMatch(UUID_REGEX);
        global.crypto = crypto;
    });
});
