import {
    stringToUint8Array,
    uint8ArrayToString
} from '@deneb-viz/utils/type-conversion';
import { getTokenizedSpec } from '../tokenizer';
import {
    TRACKED_FIELDS_NO_REMAP_PENDING,
    TRACKED_FIELDS_REMAP_PENDING
} from '../../../../__test__/fixtures';
import { describe, expect, it } from 'vitest';
import { type IDenebTokenizationRequestPayload } from '../types';
import { getTokenPatternsReplacement } from '@deneb-viz/data-core/field';

describe('getTokenizedSpec', () => {
    const specification =
        '{\n  "autosize": "fit",\n  "signals": [\n    {\n      "name": "pbiCrossFilterSelection",\n      "value": [],\n      "on": [\n        {\n          "events": {\n            "source": "scope",\n            "type": "mouseup",\n            "markname": "data-point"\n          },\n          "update": "pbiCrossFilterApply(event, \'datum[\\\\\'Date\\\\\'] >= _{Date}_\')"\n        },\n        {\n          "events": {\n            "source": "view",\n            "type": "mouseup",\n            "filter": [\n              "!event.item || event.item.mark.name != \'data-point\'"\n            ]\n          },\n          "update": "pbiCrossFilterClear()"\n        }\n      ]\n    }\n  ],\n  "data": [\n    {"name": "dataset"},\n    {\n      "name": "data_0",\n      "source": "dataset",\n      "transform": [\n        {"type": "formula", "expr": "toDate(datum[\\"Date\\"])", "as": "Date"},\n        {\n          "type": "filter",\n          "expr": "(isDate(datum[\\"Date\\"]) || (isValid(datum[\\"Date\\"]) && isFinite(+datum[\\"Date\\"]))) && isValid(datum[\\"$ Sales\\"]) && isFinite(+datum[\\"$ Sales\\"])"\n        }\n      ]\n    }\n  ],\n  "marks": [\n    {\n      "name": "data-point",\n      "type": "symbol",\n      "style": ["point"],\n      "from": {"data": "data_0"},\n      "encode": {\n        "update": {\n          "opacity": [\n            {"test": "datum[\'__selected__\'] != \'off\'", "value": 1},\n            {"value": 0.3}],\n          "fill": {"value": "blue"},\n          "stroke": {"value": "#4c78a8"},\n          "ariaRoleDescription": {"value": "point"},\n          "description": {\n            "signal": "\\"Date: \\" + (timeFormat(datum[\\"Date\\"], \'%b %d, %Y\')) + \\"; $ Sales: \\" + (format(datum[\\"$ Sales\\"], \\"\\"))"\n          },\n          "x": {"scale": "x", "field": "Date"},\n          "y": {"scale": "y", "field": "$ Sales"}\n        }\n      }\n    }\n  ],\n  "scales": [\n    {\n      "name": "x",\n      "type": "time",\n      "domain": {"data": "data_0", "field": "Date"},\n      "range": [0, {"signal": "width"}]\n    },\n    {\n      "name": "y",\n      "type": "linear",\n      "domain": {"data": "data_0", "field": "$ Sales"},\n      "range": [{"signal": "height"}, 0],\n      "nice": true,\n      "zero": true\n    }\n  ],\n  "axes": [\n    {\n      "scale": "x",\n      "orient": "bottom",\n      "gridScale": "y",\n      "grid": true,\n      "tickCount": {"signal": "ceil(width/40)"},\n      "domain": false,\n      "labels": false,\n      "aria": false,\n      "maxExtent": 0,\n      "minExtent": 0,\n      "ticks": false,\n      "zindex": 0\n    },\n    {\n      "scale": "y",\n      "orient": "left",\n      "gridScale": "x",\n      "grid": true,\n      "tickCount": {"signal": "ceil(height/40)"},\n      "domain": false,\n      "labels": false,\n      "aria": false,\n      "maxExtent": 0,\n      "minExtent": 0,\n      "ticks": false,\n      "zindex": 0\n    },\n    {\n      "scale": "x",\n      "orient": "bottom",\n      "grid": false,\n      "title": "Date",\n      "labelFlush": true,\n      "labelOverlap": true,\n      "tickCount": {"signal": "ceil(width/40)"},\n      "zindex": 0\n    },\n    {\n      "scale": "y",\n      "orient": "left",\n      "grid": false,\n      "title": "$ Sales",\n      "labelOverlap": true,\n      "tickCount": {"signal": "ceil(height/40)"},\n      "zindex": 0\n    }\n  ]\n}';
    const expectedSpecification =
        '{\n  "autosize": "fit",\n  "signals": [\n    {\n      "name": "pbiCrossFilterSelection",\n      "value": [],\n      "on": [\n        {\n          "events": {\n            "source": "scope",\n            "type": "mouseup",\n            "markname": "data-point"\n          },\n          "update": "pbiCrossFilterApply(event, \'datum[\\\\\'__0__\\\\\'] >= _{__0__}_\')"\n        },\n        {\n          "events": {\n            "source": "view",\n            "type": "mouseup",\n            "filter": [\n              "!event.item || event.item.mark.name != \'data-point\'"\n            ]\n          },\n          "update": "pbiCrossFilterClear()"\n        }\n      ]\n    }\n  ],\n  "data": [\n    {"name": "dataset"},\n    {\n      "name": "data_0",\n      "source": "dataset",\n      "transform": [\n        {"type": "formula", "expr": "toDate(datum[\\"__0__\\"])", "as": "__0__"},\n        {\n          "type": "filter",\n          "expr": "(isDate(datum[\\"__0__\\"]) || (isValid(datum[\\"__0__\\"]) && isFinite(+datum[\\"__0__\\"]))) && isValid(datum[\\"__1__\\"]) && isFinite(+datum[\\"__1__\\"])"\n        }\n      ]\n    }\n  ],\n  "marks": [\n    {\n      "name": "data-point",\n      "type": "symbol",\n      "style": ["point"],\n      "from": {"data": "data_0"},\n      "encode": {\n        "update": {\n          "opacity": [\n            {"test": "datum[\'__selected__\'] != \'off\'", "value": 1},\n            {"value": 0.3}],\n          "fill": {"value": "blue"},\n          "stroke": {"value": "#4c78a8"},\n          "ariaRoleDescription": {"value": "point"},\n          "description": {\n            "signal": "\\"Date: \\" + (timeFormat(datum[\\"__0__\\"], \'%b %d, %Y\')) + \\"; $ Sales: \\" + (format(datum[\\"__1__\\"], \\"\\"))"\n          },\n          "x": {"scale": "x", "field": "__0__"},\n          "y": {"scale": "y", "field": "__1__"}\n        }\n      }\n    }\n  ],\n  "scales": [\n    {\n      "name": "x",\n      "type": "time",\n      "domain": {"data": "data_0", "field": "__0__"},\n      "range": [0, {"signal": "width"}]\n    },\n    {\n      "name": "y",\n      "type": "linear",\n      "domain": {"data": "data_0", "field": "__1__"},\n      "range": [{"signal": "height"}, 0],\n      "nice": true,\n      "zero": true\n    }\n  ],\n  "axes": [\n    {\n      "scale": "x",\n      "orient": "bottom",\n      "gridScale": "y",\n      "grid": true,\n      "tickCount": {"signal": "ceil(width/40)"},\n      "domain": false,\n      "labels": false,\n      "aria": false,\n      "maxExtent": 0,\n      "minExtent": 0,\n      "ticks": false,\n      "zindex": 0\n    },\n    {\n      "scale": "y",\n      "orient": "left",\n      "gridScale": "x",\n      "grid": true,\n      "tickCount": {"signal": "ceil(height/40)"},\n      "domain": false,\n      "labels": false,\n      "aria": false,\n      "maxExtent": 0,\n      "minExtent": 0,\n      "ticks": false,\n      "zindex": 0\n    },\n    {\n      "scale": "x",\n      "orient": "bottom",\n      "grid": false,\n      "title": "__0__",\n      "labelFlush": true,\n      "labelOverlap": true,\n      "tickCount": {"signal": "ceil(width/40)"},\n      "zindex": 0\n    },\n    {\n      "scale": "y",\n      "orient": "left",\n      "grid": false,\n      "title": "__1__",\n      "labelOverlap": true,\n      "tickCount": {"signal": "ceil(height/40)"},\n      "zindex": 0\n    }\n  ]\n}';

    it('should replace placeholders with values for remap spec', () => {
        const supplementaryReplacers = getTokenPatternsReplacement(
            undefined,
            undefined
        );
        const options: IDenebTokenizationRequestPayload = {
            spec: stringToUint8Array(specification),
            trackedFields: TRACKED_FIELDS_REMAP_PENDING,
            supplementaryReplacers,
            isRemap: true
        };
        const result = getTokenizedSpec(options);
        expect(uint8ArrayToString(result.spec)).toEqual(expectedSpecification);
    });

    it('should replace placeholders with values for non-remap spec', () => {
        const supplementaryReplacers = getTokenPatternsReplacement(
            undefined,
            undefined
        );
        const options: IDenebTokenizationRequestPayload = {
            spec: stringToUint8Array(specification),
            trackedFields: TRACKED_FIELDS_NO_REMAP_PENDING,
            supplementaryReplacers,
            isRemap: false
        };
        const result = getTokenizedSpec(options);
        expect(uint8ArrayToString(result.spec)).toEqual(expectedSpecification);
    });
    it('should handle empty text spec (tracked fields will be empty also)', () => {
        const options = {
            spec: stringToUint8Array('{}'),
            trackedFields: {}
        } as IDenebTokenizationRequestPayload;
        const expectedSpec = '{}';
        const result = getTokenizedSpec(options);
        expect(uint8ArrayToString(result.spec)).toEqual(expectedSpec);
    });
    // Issue #521: field names as bare string literals inside expressions (not datum accessors) were tracked but never
    // tokenized, so exported templates kept the original field name in e.g. pluck(data('dataset'), 'Field').
    it('should tokenize field names used as quoted string literals within expressions', () => {
        const spec = JSON.stringify(
            {
                params: [
                    {
                        name: 'single',
                        expr: "pluck(data('dataset'), 'CategoryName')[1]"
                    },
                    {
                        name: 'double',
                        expr: 'pluck(data("dataset"), "CategoryName")[1]'
                    },
                    {
                        name: 'nested',
                        expr: "pbiCrossFilterApply(event, 'pluck(data(\\'dataset\\'), \\'CategoryName\\')')"
                    },
                    {
                        name: 'highlight',
                        expr: "pluck(data('dataset'), 'CategoryName__highlight')[1]"
                    },
                    {
                        name: 'not-a-match',
                        expr: "'Sales CategoryName' + 'CategoryName Total'"
                    },
                    {
                        name: 'dataset-and-scale-names-excluded',
                        expr: "pluck(data('CategoryName'), 'CategoryName') + scale( \"CategoryName\", datum.x) + indata('CategoryName', 'CategoryName', 1)"
                    }
                ]
            },
            null,
            2
        );
        const trackedFields = {
            'Product.CategoryName': {
                placeholder: '__dataset.0__',
                paths: [
                    ['params', 0, 'expr'],
                    ['params', 1, 'expr'],
                    ['params', 2, 'expr'],
                    ['params', 3, 'expr'],
                    ['params', 4, 'expr'],
                    ['params', 5, 'expr']
                ],
                isInDataset: true,
                isInSpecification: true,
                isMappingRequired: false,
                templateMetadata: {
                    key: 'Product.CategoryName',
                    name: 'CategoryName',
                    namePlaceholder: 'CategoryName',
                    description: '',
                    kind: 'column',
                    type: 'text'
                },
                templateMetadataOriginal: {
                    key: 'Product.CategoryName',
                    name: 'CategoryName',
                    namePlaceholder: 'CategoryName',
                    description: '',
                    kind: 'column',
                    type: 'text'
                }
            }
        } as IDenebTokenizationRequestPayload['trackedFields'];
        const result = getTokenizedSpec({
            spec: stringToUint8Array(spec),
            trackedFields,
            supplementaryReplacers: getTokenPatternsReplacement(),
            isRemap: false
        });
        const params = JSON.parse(uint8ArrayToString(result.spec)).params;
        expect(params[0].expr).toBe(
            "pluck(data('dataset'), '__dataset.0__')[1]"
        );
        expect(params[1].expr).toBe(
            'pluck(data("dataset"), "__dataset.0__")[1]'
        );
        expect(params[2].expr).toBe(
            "pbiCrossFilterApply(event, 'pluck(data(\\'dataset\\'), \\'__dataset.0__\\')')"
        );
        expect(params[3].expr).toBe(
            "pluck(data('dataset'), '__dataset.0____highlight')[1]"
        );
        expect(params[4].expr).toBe(
            "'Sales CategoryName' + 'CategoryName Total'"
        );
        expect(params[5].expr).toBe(
            "pluck(data('CategoryName'), '__dataset.0__') + scale( \"CategoryName\", datum.x) + indata('CategoryName', '__dataset.0__', 1)"
        );
    });
});
