import * as features from '../../src/api/features';
import isSelectedFeatureEnabled = features.isFeatureEnabled;

describe('API: Features', () => {
    describe('isSelectedFeatureEnabled', () => {
        it('Unknown Key', () => {
            const feature = 'Invalid Feature';
            expect(isSelectedFeatureEnabled(feature)).toEqual(false);
        });
        it('Null feature', () => {
            const feature = null;
            expect(isSelectedFeatureEnabled(feature)).toEqual(false);
        });
        it('Undefined feature', () => {
            const feature = undefined;
            expect(isSelectedFeatureEnabled(feature)).toEqual(false);
        });
        it('Empty', () => {
            const feature = '';
            expect(isSelectedFeatureEnabled(feature)).toEqual(false);
        });
        it('Valid Key, Should Always be False', () => {
            const feature = 'unitTestCanary';
            expect(isSelectedFeatureEnabled(feature)).toEqual(false);
        });
        it('Valid Key, Should be True (as of 0.1)', () => {
            const feature = 'tooltipHandler';
            expect(isSelectedFeatureEnabled(feature)).toEqual(true);
        });
        it('Valid Key, Should be True (as of 0.1), with whitespace', () => {
            const feature = ' tooltipHandler ';
            expect(isSelectedFeatureEnabled(feature)).toEqual(true);
        });
    });
});