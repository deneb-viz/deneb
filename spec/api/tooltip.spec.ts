import { extractTooltipDataItemsFromObject } from '../../src/api/tooltip/src/extractTooltipDataItemsFromObject';
import powerbi from 'powerbi-visuals-api';
import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

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
            basicKeyValueResult: VisualTooltipDataItem[] = [
                { displayName: 'category', value: 'Test' },
                { displayName: 'value', value: '1.38' }
            ];
        it('Simple object', () => {
            const result = extractTooltipDataItemsFromObject(basicKeyValue);
            expect(result).toMatchObject(basicKeyValueResult);
            expect(result.length).toEqual(2);
        });
        it('Containing __key__ and __identity__', () => {
            const result = extractTooltipDataItemsFromObject(
                keyValueWithReserved
            );
            expect(result).toMatchObject(basicKeyValueResult);
            expect(result.length).toEqual(2);
        });
    });
});
