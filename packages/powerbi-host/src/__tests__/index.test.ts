import { describe, expect, it } from 'vitest';
import { POWERBI_HOST_PACKAGE_NAME } from '../index';

describe('package entry', () => {
    it('exposes the package name', () => {
        expect(POWERBI_HOST_PACKAGE_NAME).toBe('@deneb-viz/powerbi-host');
    });
});
