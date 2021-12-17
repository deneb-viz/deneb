import {
    cleanParse,
    getJsonAsIndentedString
} from '../../../src/core/utils/json';

const simpleJsonObject = { test: 'one', array: [] };

describe('core/utils/json', () => {
    describe('cleanParse', () => {
        const simpleJsonString = '{"test": "one", "array": []}';
        const simpleJsonStringInvalid = '{"test: "one", "array": ]}';
        const fallbackDefaultObject = {};
        it('Simple valid parse', () => {
            const result = cleanParse(simpleJsonString);
            expect(result).toMatchObject(simpleJsonObject);
        });
        it('Simple invalid parse - default fallback', () => {
            const result = cleanParse(simpleJsonStringInvalid);
            expect(result).toMatchObject(fallbackDefaultObject);
        });
        it('Simple invalid parse - simple fallback', () => {
            const result = cleanParse(
                simpleJsonStringInvalid,
                simpleJsonString
            );
            expect(result).toMatchObject(simpleJsonObject);
        });
        it('Parse undefined', () => {
            const result = cleanParse(undefined);
            expect(result).toMatchObject(fallbackDefaultObject);
        });
        it('Parse null', () => {
            const result = cleanParse(null);
            expect(result).toBeNull();
        });
        it('Parse number', () => {
            const input = 0;
            const result = cleanParse(`${input}`);
            expect(result).toEqual(0);
        });
    });
    describe('getJsonAsIndentedString', () => {
        const simpleJsonString = '{"test": "one", "array": []}';
        const longJsonObject = {
            test: 'one',
            array: ['one', 'two', 'three', 'four', 'five']
        };
        const longJsonStringEditor =
            '{\n  "test": "one",\n  "array": [\n    "one",\n    "two",\n    "three",\n    "four",\n    "five"\n  ]\n}';
        const longJsonStringTooltip =
            '{\n\u2800"test": "one",\n\u2800"array": [\n\u2800\u2800"one",\n\u2800\u2800"two",\n\u2800\u2800"three",\n\u2800\u2800"four",\n\u2800\u2800"five"\n\u2800]\n}';
        it('Simple indent (Editor)', () => {
            const result = getJsonAsIndentedString(simpleJsonObject);
            expect(result).toEqual(simpleJsonString);
        });
        it('Simple indent (Tooltip)', () => {
            const result = getJsonAsIndentedString(simpleJsonObject, 'tooltip');
            expect(result).toEqual(simpleJsonString);
        });
        it('Wide indent (Editor)', () => {
            const result = getJsonAsIndentedString(longJsonObject);
            expect(result).toEqual(longJsonStringEditor);
        });
        it('Wide indent (Tooltip)', () => {
            const result = getJsonAsIndentedString(longJsonObject, 'tooltip');
            expect(result).toEqual(longJsonStringTooltip);
        });
    });
});
