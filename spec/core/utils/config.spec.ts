import { getIcons, getVisualMetadata } from '../../../src/core/utils/config';

describe('core/utils/features', () => {
    describe('getIcons', () => {
        it('Icon configuration', () => {
            const icons = getIcons();
            expect(icons).toHaveProperty('BarChartVertical');
        });
    });
    describe('getVisualMetadata', () => {
        it('Visual metadata', () => {
            const metadata = getVisualMetadata();
            expect(metadata).toHaveProperty('guid');
            expect(metadata.guid).toEqual(
                'deneb7E15AEF80B9E4D4F8E12924291ECE89A'
            );
        });
    });
});
