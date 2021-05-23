import * as dataView from '../../src/api/dataView';
import encodeFieldForSpec = dataView.encodeFieldForSpec;

describe('API: Data View', () => {
    describe('encodeDataViewFieldForSpec', () => {
        it('Simple Name', () => {
            const name = 'Simple';
            expect(encodeFieldForSpec(name)).toEqual(name);
        });
        it('Simple Name w/Spaces and Non-Special Characters', () => {
            const name = '$ Sales (Prior Year)';
            expect(encodeFieldForSpec(name)).toEqual(name);
        });
        it('Containing Backslash', () => {
            const name = '$ Sales \\ (Prior Year)';
            expect(encodeFieldForSpec(name)).not.toEqual(name);
            expect(encodeFieldForSpec(name)).toEqual('$ Sales _ (Prior Year)');
        });
        it('Containing Double Quote', () => {
            const name = '$ Sales " (Prior Year)';
            expect(encodeFieldForSpec(name)).not.toEqual(name);
            expect(encodeFieldForSpec(name)).toEqual('$ Sales _ (Prior Year)');
        });
        it('Containing Dot', () => {
            const name = '$ Sales . (Prior Year)';
            expect(encodeFieldForSpec(name)).not.toEqual(name);
            expect(encodeFieldForSpec(name)).toEqual('$ Sales _ (Prior Year)');
        });
        it('Containing Square Bracket Open', () => {
            const name = '$ Sales [ (Prior Year)';
            expect(encodeFieldForSpec(name)).not.toEqual(name);
            expect(encodeFieldForSpec(name)).toEqual('$ Sales _ (Prior Year)');
        });
        it('Containing Square Bracket Close', () => {
            const name = '$ Sales ] (Prior Year)';
            expect(encodeFieldForSpec(name)).not.toEqual(name);
            expect(encodeFieldForSpec(name)).toEqual('$ Sales _ (Prior Year)');
        });
        it('Containing Square Bracket Open', () => {
            const name = '$ Sales [ (Prior Year)';
            expect(encodeFieldForSpec(name)).not.toEqual(name);
            expect(encodeFieldForSpec(name)).toEqual('$ Sales _ (Prior Year)');
        });
        it('Containing Multiple Occurrences', () => {
            const name = 'Sales.Prior.Year';
            expect(encodeFieldForSpec(name)).not.toEqual(name);
            expect(encodeFieldForSpec(name)).toEqual('Sales_Prior_Year');
        });
        it('Containing Multiple Adjacent Occurrences', () => {
            const name = 'Sales..Prior..Year';
            expect(encodeFieldForSpec(name)).not.toEqual(name);
            expect(encodeFieldForSpec(name)).toEqual('Sales__Prior__Year');
        });
        it('Containing Multiple Special Chars', () => {
            const name = 'Sales.Prior[Year]';
            expect(encodeFieldForSpec(name)).not.toEqual(name);
            expect(encodeFieldForSpec(name)).toEqual('Sales_Prior_Year_');
        });
    });
});
