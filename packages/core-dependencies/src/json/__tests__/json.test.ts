import { getJsonPlaceholderKey } from '../processing';

describe('getJsonPlaceholderKey', () => {
    it('should return a placeholder key', () => {
        expect(getJsonPlaceholderKey(0)).toBe('__0__');
    });
    it('should return a placeholder key with positive number', () => {
        expect(getJsonPlaceholderKey(5)).toBe('__5__');
    });
    it('should return a placeholder key with negative number', () => {
        expect(getJsonPlaceholderKey(-3)).toBe('__3__');
    });
    it('should return a placeholder key with decimal number floored down', () => {
        expect(getJsonPlaceholderKey(2.5)).toBe('__2__');
    });
});
