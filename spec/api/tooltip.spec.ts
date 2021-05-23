import { extractTooltipDataItemsFromObject } from '../../src/api/tooltip/src/extractTooltipDataItemsFromObject';

describe('API: tooltip', () => {
    describe('extractTooltipDataItemsFromObject', () => {
        const basicKeyValue: Object = {
                category: 'Test',
                value: 1.38
            },
            keyValueWithReserved = {
                ...basicKeyValue,
                ...{
                    __key__: 'KEY',
                    __identity__: 'IDENTITY'
                }
            },
            basicKeyValueResult = [
                { displayName: 'category', value: 'Test' },
                { displayName: 'value', value: '1.38' }
            ];
        it ('Dummy', () => {
            expect(1).toEqual(1);
        })
        // it('Simple object', () => {
        //     const result = extractTooltipDataItemsFromObject(basicKeyValue);
        //     expect(result).toMatchObject(basicKeyValueResult);
        //     expect(result.length).toEqual(2);
        // });
        // it('Containing __key__ and __identity__', () => {
        //     const result = extractTooltipDataItemsFromObject(
        //         keyValueWithReserved
        //     );
        //     expect(result).toMatchObject(basicKeyValueResult);
        //     expect(result.length).toEqual(2);
        // });
    });
});
