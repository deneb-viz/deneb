import {
    getJsonLanguageService,
    getJsonLocationAtPath,
    getJsonPureString,
    getJsonTextDocument,
    getJsoncStringAsObject,
    getModifiedJsoncByPath,
    getParsedJsonWithResult,
    getTextFormattedAsJsonC
} from '../processing';

const JSONC_SIMPLE = '{"name": "John", /* comment */ "age": 30}';
const JSONC_BROKEN_BLOCK_COMMENT = '{"name": "John", /* comment "age": 30}';

describe('getJsoncStringAsObject', () => {
    it('should return the parsed JSON object', () => {
        const content = JSONC_SIMPLE;
        const expected = { name: 'John', age: 30 };
        expect(getJsoncStringAsObject(content)).toEqual(expected);
    });
    it('should return null if the content is not valid JSON', () => {
        const content = '{"name": "John", "age": 30,}';
        expect(getJsoncStringAsObject(content)).toBeNull();
    });
    it('should return an empty object if the content is empty', () => {
        const content = '';
        const expected = {};
        expect(getJsoncStringAsObject(content)).toEqual(expected);
    });
    it('should return a null object if broken comment block is supplied', () => {
        const content = JSONC_BROKEN_BLOCK_COMMENT;
        expect(getJsoncStringAsObject(content)).toBeNull();
    });
});

describe('getJsonLanguageService', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' }, age: { type: 'number' } } };
    const jsonData = '{"name": "John", "age": 30}';
    it('should return the language service with the provided schema and validate', async () => {
        const languageService = getJsonLanguageService(schema);
        const document = getJsonTextDocument(jsonData);
        const validation = await languageService.doValidation(
            document,
            languageService.parseJSONDocument(document),
            {}
        );
        expect(languageService).toBeDefined();
        expect(validation).toEqual([]);
    });
});

describe('getJsonLocationAtPath', () => {
    it('should be defined if a valid path is specified', () => {
        const content = '{"name": "John", "age": 30}';
        const path = ['name'];
        expect(getJsonLocationAtPath(content, path)).toBeDefined();
    });
    it('should return undefined if the JSON node at the specified path does not exist', () => {
        const content = '{"name": "John", "age": 30}';
        const path = ['address'];
        expect(getJsonLocationAtPath(content, path)).toBeUndefined();
    });
    it('should return undefined if the content is not valid JSON', () => {
        const content = 'Not JSON';
        const path = ['name'];
        expect(getJsonLocationAtPath(content, path)).toBeUndefined();
    });
});

describe('getJsonPure', () => {
    it('should return the stripped JSON content', () => {
        const content = JSONC_SIMPLE;
        const expected = '{"name": "John",                "age": 30}';
        expect(getJsonPureString(content)).toBe(expected);
    });
    it('should return an empty object if the content is empty', () => {
        const content = '';
        const expected = '{}';
        expect(getJsonPureString(content)).toBe(expected);
    });
    it('should return an empty object if the content is null', () => {
        const content = null;
        const expected = '{}';
        expect(getJsonPureString(content)).toBe(expected);
    });
    it('should return an empty object if the content is undefined', () => {
        const content = undefined;
        const expected = '{}';
        expect(getJsonPureString(content)).toBe(expected);
    });
    it('should replace JSONC comments with the specified character', () => {
        const content = JSONC_SIMPLE;
        const replaceCh = '-';
        const expected = '{"name": "John", -------------- "age": 30}';
        expect(getJsonPureString(content, replaceCh)).toBe(expected);
    });
    it('should preserve line numbers when replacing JSONC comments', () => {
        const content = '{\n  "name": "John",\n  /* comment */\n  "age": 30\n}';
        const expected = '{\n  "name": "John",\n                \n  "age": 30\n}';
        expect(getJsonPureString(content)).toBe(expected);
    });
    it('should not fail when attempting to parse incomplete block comments', () => {
        const content = JSONC_BROKEN_BLOCK_COMMENT;
        const replaceCh = '-';
        const expected = '{"name": "John", ----------------------';
        expect(getJsonPureString(content, replaceCh)).toBe(expected);
    });
});

describe('getJsonTextDocument', () => {
    it('should create a JSON text document with the provided content', () => {
        const content = '{"name": "John", "age": 30}';
        expect(getJsonTextDocument(content)).toBeDefined();
    });
});

describe('getModifiedJsoncByPath', () => {
    it('should modify the JSON content at the specified path and return the modified content', () => {
        const content = '{"name": "John", "age": 30}';
        const path = ['name'];
        const value = 'Jane';
        const expected = '{"name": "Jane", "age": 30}';
        expect(getModifiedJsoncByPath(content, path, value)).toBe(expected);
    });
    it('should modify the JSON content at the specified nested path and return the modified content', () => {
        const content = '{"person": {"name": "John", "age": 30}}';
        const path = ['person', 'name'];
        const value = 'Jane';
        const expected = '{"person": {"name": "Jane", "age": 30}}';
        expect(getModifiedJsoncByPath(content, path, value)).toBe(expected);
    });
    it('should modify the JSON content at the specified array path and return the modified content', () => {
        const content = '{"people": [{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]}';
        const path = ['people', 1, 'name'];
        const value = 'Alice';
        const expected = '{"people": [{"name": "John", "age": 30}, {"name": "Alice", "age": 25}]}';
        expect(getModifiedJsoncByPath(content, path, value)).toBe(expected);
    });
    it('should modify the JSON content at the specified path with a boolean value and return the modified content', () => {
        const content = '{"name": "John", "age": 30}';
        const path = ['age'];
        const value = false;
        const expected = '{"name": "John", "age": false}';
        expect(getModifiedJsoncByPath(content, path, value)).toBe(expected);
    });
    it('should modify the JSON content at the specified path with a null value and return the modified content', () => {
        const content = '{"name": "John", "age": 30}';
        const path = ['name'];
        const value = null;
        const expected = '{"name": null, "age": 30}';
        expect(getModifiedJsoncByPath(content, path, value)).toBe(expected);
    });
});

describe('getParsedJsonWithResult', () => {
    it('should return the parsed JSON object and an empty error array if the content is valid JSON', () => {
        const content = JSONC_SIMPLE;
        const expected = { result: { name: 'John', age: 30 }, errors: [] };
        expect(getParsedJsonWithResult(content)).toEqual(expected);
    });
    it('should return the parsed fallback JSON object and an empty error array if the content is not valid JSON and a fallback is provided', () => {
        const content = '{"name": "John", "age": 30,}';
        const fallback = '{"name": "Fallback", "age": 0}';
        const expected = { result: { name: 'Fallback', age: 0 }, errors: [] };
        expect(getParsedJsonWithResult(content, fallback)).toEqual(expected);
    });
    it('should return the parsed fallback JSON object and an empty error array if the content is not valid JSON and a fallback is provided (null fallback)', () => {
        const content = '{"name": "John", "age": 30,}';
        const expected = { result: null, errors: ['Expected double-quoted property name in JSON at position 27'] };
        expect(getParsedJsonWithResult(content)).toEqual(expected);
    });
});

describe('getTextFormattedAsJsonC', () => {
    it('should format the JSONC content with the specified tab size', () => {
        const content = '{"name": "John", "age": 30}';
        const tabSize = 4;
        const indent = ' '.repeat(tabSize);
        const expected = `{\n${indent}"name": "John",\n${indent}"age": 30\n}`;
        expect(getTextFormattedAsJsonC(content, tabSize)).toBe(expected);
    });
});
