import {
    IDenebTokenizationRequestPayload,
    TrackedFields,
    stringToUint8Array,
    uint8ArrayToString
} from '@deneb-viz/core-dependencies';
import { getPowerBiTokenPatternsReplacement } from '@deneb-viz/integration-powerbi';
import { getTokenizedSpec } from '../tokenizer';

const TRACKED_FIELDS_NO_REMAP_PENDING: TrackedFields = {
    'Date.Date': {
        placeholder: '__0__',
        paths: [
            ['signals', 0, 'on', 0, 'update'],
            ['data', 1, 'transform', 0, 'expr'],
            ['data', 1, 'transform', 0, 'as'],
            ['data', 1, 'transform', 1, 'expr'],
            ['marks', 0, 'encode', 'update', 'description', 'signal'],
            ['marks', 0, 'encode', 'update', 'x', 'field'],
            ['scales', 0, 'domain', 'field'],
            ['axes', 2, 'title']
        ],
        isInDataset: true,
        isInSpecification: true,
        isMappingRequired: false,
        templateMetadata: {
            key: 'Date.Date',
            name: 'Date',
            namePlaceholder: 'Date',
            description: '',
            kind: 'column',
            type: 'dateTime'
        },
        templateMetadataOriginal: {
            key: 'Date.Date',
            name: 'Date',
            namePlaceholder: 'Date',
            description: '',
            kind: 'column',
            type: 'dateTime'
        }
    },
    'Financials.$ Sales': {
        placeholder: '__1__',
        paths: [
            ['data', 1, 'transform', 1, 'expr'],
            ['marks', 0, 'encode', 'update', 'description', 'signal'],
            ['marks', 0, 'encode', 'update', 'y', 'field'],
            ['scales', 1, 'domain', 'field'],
            ['axes', 3, 'title']
        ],
        isInDataset: true,
        isInSpecification: true,
        isMappingRequired: false,
        templateMetadata: {
            key: 'Financials.$ Sales',
            name: '$ Sales',
            namePlaceholder: '$ Sales',
            description: '',
            kind: 'measure',
            type: 'numeric'
        },
        templateMetadataOriginal: {
            key: 'Financials.$ Sales',
            name: '$ Sales',
            namePlaceholder: '$ Sales',
            description: '',
            kind: 'measure',
            type: 'numeric'
        }
    }
};

const TRACKED_FIELDS_REMAP_PENDING: TrackedFields = {
    'Date.Date': {
        placeholder: '__0__',
        paths: [
            ['signals', 0, 'on', 0, 'update'],
            ['data', 1, 'transform', 0, 'expr'],
            ['data', 1, 'transform', 0, 'as'],
            ['data', 1, 'transform', 1, 'expr'],
            ['marks', 0, 'encode', 'update', 'description', 'signal'],
            ['marks', 0, 'encode', 'update', 'x', 'field'],
            ['scales', 0, 'domain', 'field'],
            ['axes', 2, 'title']
        ],
        isInDataset: true,
        isInSpecification: true,
        isMappingRequired: true,
        templateMetadata: {
            key: 'Date.Date',
            name: 'Date',
            namePlaceholder: 'Date',
            description: '',
            kind: 'column',
            type: 'dateTime'
        },
        templateMetadataOriginal: {
            key: 'Date.Date',
            name: 'Date',
            namePlaceholder: 'Date',
            description: '',
            kind: 'column',
            type: 'dateTime'
        }
    },
    'Financials.$ Sales': {
        placeholder: '__1__',
        paths: [
            ['data', 1, 'transform', 1, 'expr'],
            ['marks', 0, 'encode', 'update', 'description', 'signal'],
            ['marks', 0, 'encode', 'update', 'y', 'field'],
            ['scales', 1, 'domain', 'field'],
            ['axes', 3, 'title']
        ],
        isInDataset: true,
        isInSpecification: true,
        isMappingRequired: false,
        templateMetadata: {
            key: 'Financials.$ Sales',
            name: '$ Sales',
            namePlaceholder: '$ Sales',
            description: '',
            kind: 'measure',
            type: 'numeric'
        },
        templateMetadataOriginal: {
            key: 'Financials.$ Sales',
            name: '$ Sales',
            namePlaceholder: '$ Sales',
            description: '',
            kind: 'measure',
            type: 'numeric'
        }
    },
    'Date.Year Month': {
        placeholder: '__2__',
        paths: [],
        isInDataset: true,
        isInSpecification: false,
        isMappingRequired: false,
        templateMetadata: {
            key: 'Date.Year Month',
            name: 'Year Month',
            namePlaceholder: 'Year Month',
            description: '',
            kind: 'column',
            type: 'dateTime'
        },
        templateMetadataOriginal: {
            key: 'Date.Year Month',
            name: 'Year Month',
            namePlaceholder: 'Year Month',
            description: '',
            kind: 'column',
            type: 'dateTime'
        }
    }
};

describe('getTokenizedSpec', () => {
    const specification =
        '{\n  "autosize": "fit",\n  "signals": [\n    {\n      "name": "pbiCrossFilterSelection",\n      "value": [],\n      "on": [\n        {\n          "events": {\n            "source": "scope",\n            "type": "mouseup",\n            "markname": "data-point"\n          },\n          "update": "pbiCrossFilterApply(event, \'datum[\\\\\'Date\\\\\'] >= _{Date}_\')"\n        },\n        {\n          "events": {\n            "source": "view",\n            "type": "mouseup",\n            "filter": [\n              "!event.item || event.item.mark.name != \'data-point\'"\n            ]\n          },\n          "update": "pbiCrossFilterClear()"\n        }\n      ]\n    }\n  ],\n  "data": [\n    {"name": "dataset"},\n    {\n      "name": "data_0",\n      "source": "dataset",\n      "transform": [\n        {"type": "formula", "expr": "toDate(datum[\\"Date\\"])", "as": "Date"},\n        {\n          "type": "filter",\n          "expr": "(isDate(datum[\\"Date\\"]) || (isValid(datum[\\"Date\\"]) && isFinite(+datum[\\"Date\\"]))) && isValid(datum[\\"$ Sales\\"]) && isFinite(+datum[\\"$ Sales\\"])"\n        }\n      ]\n    }\n  ],\n  "marks": [\n    {\n      "name": "data-point",\n      "type": "symbol",\n      "style": ["point"],\n      "from": {"data": "data_0"},\n      "encode": {\n        "update": {\n          "opacity": [\n            {"test": "datum[\'__selected__\'] != \'off\'", "value": 1},\n            {"value": 0.3}],\n          "fill": {"value": "blue"},\n          "stroke": {"value": "#4c78a8"},\n          "ariaRoleDescription": {"value": "point"},\n          "description": {\n            "signal": "\\"Date: \\" + (timeFormat(datum[\\"Date\\"], \'%b %d, %Y\')) + \\"; $ Sales: \\" + (format(datum[\\"$ Sales\\"], \\"\\"))"\n          },\n          "x": {"scale": "x", "field": "Date"},\n          "y": {"scale": "y", "field": "$ Sales"}\n        }\n      }\n    }\n  ],\n  "scales": [\n    {\n      "name": "x",\n      "type": "time",\n      "domain": {"data": "data_0", "field": "Date"},\n      "range": [0, {"signal": "width"}]\n    },\n    {\n      "name": "y",\n      "type": "linear",\n      "domain": {"data": "data_0", "field": "$ Sales"},\n      "range": [{"signal": "height"}, 0],\n      "nice": true,\n      "zero": true\n    }\n  ],\n  "axes": [\n    {\n      "scale": "x",\n      "orient": "bottom",\n      "gridScale": "y",\n      "grid": true,\n      "tickCount": {"signal": "ceil(width/40)"},\n      "domain": false,\n      "labels": false,\n      "aria": false,\n      "maxExtent": 0,\n      "minExtent": 0,\n      "ticks": false,\n      "zindex": 0\n    },\n    {\n      "scale": "y",\n      "orient": "left",\n      "gridScale": "x",\n      "grid": true,\n      "tickCount": {"signal": "ceil(height/40)"},\n      "domain": false,\n      "labels": false,\n      "aria": false,\n      "maxExtent": 0,\n      "minExtent": 0,\n      "ticks": false,\n      "zindex": 0\n    },\n    {\n      "scale": "x",\n      "orient": "bottom",\n      "grid": false,\n      "title": "Date",\n      "labelFlush": true,\n      "labelOverlap": true,\n      "tickCount": {"signal": "ceil(width/40)"},\n      "zindex": 0\n    },\n    {\n      "scale": "y",\n      "orient": "left",\n      "grid": false,\n      "title": "$ Sales",\n      "labelOverlap": true,\n      "tickCount": {"signal": "ceil(height/40)"},\n      "zindex": 0\n    }\n  ]\n}';
    const expectedSpecification =
        '{\n  "autosize": "fit",\n  "signals": [\n    {\n      "name": "pbiCrossFilterSelection",\n      "value": [],\n      "on": [\n        {\n          "events": {\n            "source": "scope",\n            "type": "mouseup",\n            "markname": "data-point"\n          },\n          "update": "pbiCrossFilterApply(event, \'datum[\\\\\'__0__\\\\\'] >= _{__0__}_\')"\n        },\n        {\n          "events": {\n            "source": "view",\n            "type": "mouseup",\n            "filter": [\n              "!event.item || event.item.mark.name != \'data-point\'"\n            ]\n          },\n          "update": "pbiCrossFilterClear()"\n        }\n      ]\n    }\n  ],\n  "data": [\n    {"name": "dataset"},\n    {\n      "name": "data_0",\n      "source": "dataset",\n      "transform": [\n        {"type": "formula", "expr": "toDate(datum[\\"__0__\\"])", "as": "__0__"},\n        {\n          "type": "filter",\n          "expr": "(isDate(datum[\\"__0__\\"]) || (isValid(datum[\\"__0__\\"]) && isFinite(+datum[\\"__0__\\"]))) && isValid(datum[\\"__1__\\"]) && isFinite(+datum[\\"__1__\\"])"\n        }\n      ]\n    }\n  ],\n  "marks": [\n    {\n      "name": "data-point",\n      "type": "symbol",\n      "style": ["point"],\n      "from": {"data": "data_0"},\n      "encode": {\n        "update": {\n          "opacity": [\n            {"test": "datum[\'__selected__\'] != \'off\'", "value": 1},\n            {"value": 0.3}],\n          "fill": {"value": "blue"},\n          "stroke": {"value": "#4c78a8"},\n          "ariaRoleDescription": {"value": "point"},\n          "description": {\n            "signal": "\\"Date: \\" + (timeFormat(datum[\\"__0__\\"], \'%b %d, %Y\')) + \\"; $ Sales: \\" + (format(datum[\\"__1__\\"], \\"\\"))"\n          },\n          "x": {"scale": "x", "field": "__0__"},\n          "y": {"scale": "y", "field": "__1__"}\n        }\n      }\n    }\n  ],\n  "scales": [\n    {\n      "name": "x",\n      "type": "time",\n      "domain": {"data": "data_0", "field": "__0__"},\n      "range": [0, {"signal": "width"}]\n    },\n    {\n      "name": "y",\n      "type": "linear",\n      "domain": {"data": "data_0", "field": "__1__"},\n      "range": [{"signal": "height"}, 0],\n      "nice": true,\n      "zero": true\n    }\n  ],\n  "axes": [\n    {\n      "scale": "x",\n      "orient": "bottom",\n      "gridScale": "y",\n      "grid": true,\n      "tickCount": {"signal": "ceil(width/40)"},\n      "domain": false,\n      "labels": false,\n      "aria": false,\n      "maxExtent": 0,\n      "minExtent": 0,\n      "ticks": false,\n      "zindex": 0\n    },\n    {\n      "scale": "y",\n      "orient": "left",\n      "gridScale": "x",\n      "grid": true,\n      "tickCount": {"signal": "ceil(height/40)"},\n      "domain": false,\n      "labels": false,\n      "aria": false,\n      "maxExtent": 0,\n      "minExtent": 0,\n      "ticks": false,\n      "zindex": 0\n    },\n    {\n      "scale": "x",\n      "orient": "bottom",\n      "grid": false,\n      "title": "__0__",\n      "labelFlush": true,\n      "labelOverlap": true,\n      "tickCount": {"signal": "ceil(width/40)"},\n      "zindex": 0\n    },\n    {\n      "scale": "y",\n      "orient": "left",\n      "grid": false,\n      "title": "__1__",\n      "labelOverlap": true,\n      "tickCount": {"signal": "ceil(height/40)"},\n      "zindex": 0\n    }\n  ]\n}';

    it('should replace placeholders with values for remap spec', () => {
        const supplementaryReplacers = getPowerBiTokenPatternsReplacement(
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
        const supplementaryReplacers = getPowerBiTokenPatternsReplacement(
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
});
