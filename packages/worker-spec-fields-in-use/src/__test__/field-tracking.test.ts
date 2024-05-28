import {
    IDataset,
    TrackedFieldCandidates,
    TrackedFields,
    UsermetaDatasetFieldKind,
    UsermetaDatasetFieldType
} from '@deneb-viz/core-dependencies';
import {
    doesExpressionContainField,
    getDrilldownFieldExpression,
    getJsonPlaceholderKey,
    getTrackedFieldMapMerged,
    getTrackingDataFromSpecification,
    isExpressionField
} from '../field-tracking';
import { parseExpression } from 'vega-expression';

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

describe('doesExpressionContainField', () => {
    const EXPRESSION_WITH_SIMPLE_FIELD = parseExpression(
        'datum["$ Sales"] === 300'
    );
    const EXPRESSION_WITH_HIGHLIGHT_FIELD = parseExpression(
        'datum["$ Sales__highlight"] === 300'
    );
    it('should return true if the field is present in the JSON object', () => {
        const fieldName = '$ Sales';
        expect(
            doesExpressionContainField(EXPRESSION_WITH_SIMPLE_FIELD, fieldName)
        ).toBe(true);
    });
    it('should return true if the field is present in the JSON object with a highlight suffix', () => {
        const fieldName = '$ Sales';
        expect(
            doesExpressionContainField(
                EXPRESSION_WITH_HIGHLIGHT_FIELD,
                fieldName
            )
        ).toBe(true);
    });
    it('should return false if the field is not present in the JSON object', () => {
        const fieldName = 'qux';
        expect(
            doesExpressionContainField(EXPRESSION_WITH_SIMPLE_FIELD, fieldName)
        ).toBe(false);
    });

    it('should return false if the JSON object is empty', () => {
        const json = {};
        const fieldName = '$ Sales';
        expect(doesExpressionContainField(json, fieldName)).toBe(false);
    });
});

describe('getDrilldownFieldExpression', () => {
    it('should return a regular expression for drilldown field expression', () => {
        const regex = getDrilldownFieldExpression();
        expect(regex).toBeInstanceOf(RegExp);
        expect(regex.source).toBe('(__drilldown(_flat)?__)');
    });
});

describe('getJsonPlaceholderKey', () => {
    it('should return a placeholder key', () => {
        expect(getJsonPlaceholderKey(0)).toBe('__0__');
    });
    it('should return a placeholder key with positive number', () => {
        expect(getJsonPlaceholderKey(5)).toBe('__5__');
    });
    it('should return a placeholder key with negative number', () => {
        expect(getJsonPlaceholderKey(-3)).toBe('__3__');
    });
    it('should return a placeholder key with decimal number floored down', () => {
        expect(getJsonPlaceholderKey(2.5)).toBe('__2__');
    });
});

describe('getTrackedFieldMapMerged', () => {
    it('should merge the previous and current field maps', () => {
        const fieldMapPrev: TrackedFieldCandidates = {
            'Date.Date': {
                isCurrent: false,
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
            }
        };
        const fieldMapCurrent: TrackedFieldCandidates = {
            'Financials.$ Sales': {
                isCurrent: true,
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
        const mergedFieldMap = getTrackedFieldMapMerged(
            fieldMapPrev,
            fieldMapCurrent
        );
        expect(mergedFieldMap).toEqual({
            ...fieldMapPrev,
            ...fieldMapCurrent
        });
    });
});

describe('getTrackingDataFromSpecification', () => {
    const dataset: IDataset = {
        hasDrilldown: false,
        hasHighlights: false,
        hashValue: 'pfX3UvlILZ3FwDY2aCRaC+4YLzM=',
        fields: {
            Date: {
                roles: {
                    dataset: true
                },
                type: {
                    text: false,
                    numeric: false,
                    integer: false,
                    bool: false,
                    dateTime: true,
                    duration: false,
                    binary: false,

                    none: false
                },
                format: '%d/MM/yyyy',
                displayName: 'Date',
                queryName: 'Date.Date',
                expr: {
                    _kind: 2,
                    source: {
                        _kind: 0,
                        entity: 'Date',
                        variable: 'd',
                        kind: 0
                    },
                    ref: 'Date',
                    kind: 2
                },
                objects: {
                    general: {
                        formatString: '%d/MM/yyyy'
                    }
                },
                index: 1,
                identityExprs: [
                    {
                        _kind: 2,
                        source: {
                            _kind: 0,
                            entity: 'Date',
                            kind: 0
                        },
                        ref: 'Date',
                        kind: 2
                    }
                ],
                isColumn: true,
                isHighlightComponent: false,
                isExcludedFromTemplate: false,
                sourceIndex: 0,
                templateMetadata: {
                    key: 'Date.Date',
                    name: 'Date',
                    namePlaceholder: 'Date',
                    description: '',
                    kind: 'column' as UsermetaDatasetFieldKind,
                    type: 'dateTime' as UsermetaDatasetFieldType
                }
            },
            '$ Sales': {
                roles: {
                    dataset: true
                },
                type: {
                    text: false,
                    numeric: true,
                    integer: false,
                    bool: false,
                    dateTime: false,
                    duration: false,
                    binary: false,
                    none: false
                },
                format: '\\$#,0;(\\$#,0);\\$#,0',
                displayName: '$ Sales',
                queryName: 'Financials.$ Sales',
                expr: {
                    _kind: 3,
                    source: {
                        _kind: 0,
                        entity: 'Financials',
                        variable: 'f',
                        kind: 0
                    },
                    ref: '$ Sales',
                    kind: 3
                },
                sort: 2,
                sortOrder: 0,
                objects: {
                    general: {
                        formatString: '\\$#,0;(\\$#,0);\\$#,0'
                    }
                },
                index: 0,
                isMeasure: true,
                aggregates: {
                    minLocal: 128067120.56999987,
                    maxLocal: 444885390.64000285
                },
                isColumn: false,
                isHighlightComponent: false,
                isExcludedFromTemplate: false,
                sourceIndex: 0,
                templateMetadata: {
                    key: 'Financials.$ Sales',
                    name: '$ Sales',
                    namePlaceholder: '$ Sales',
                    description: '',
                    kind: 'measure' as UsermetaDatasetFieldKind,
                    type: 'numeric' as UsermetaDatasetFieldType
                }
            },
            '$ Sales__format': {
                roles: {
                    dataset: true
                },
                type: {
                    text: false,
                    numeric: true,
                    integer: false,
                    bool: false,
                    dateTime: false,
                    duration: false,
                    binary: false,
                    none: false
                },
                format: '\\$#,0;(\\$#,0);\\$#,0',
                displayName: '$ Sales__format',
                queryName: 'Financials.$ Sales',
                expr: {
                    _kind: 3,
                    source: {
                        _kind: 0,
                        entity: 'Financials',
                        variable: 'f',
                        kind: 0
                    },
                    ref: '$ Sales',
                    kind: 3
                },
                sort: 2,
                sortOrder: 0,
                objects: {
                    general: {
                        formatString: '\\$#,0;(\\$#,0);\\$#,0'
                    }
                },
                index: 0,
                isMeasure: true,
                aggregates: {
                    minLocal: 128067120.56999987,
                    maxLocal: 444885390.64000285
                },
                isColumn: false,
                isHighlightComponent: false,
                isExcludedFromTemplate: true,
                sourceIndex: 0
            },
            '$ Sales__formatted': {
                roles: {
                    dataset: true
                },
                type: {
                    text: false,
                    numeric: true,
                    integer: false,
                    bool: false,
                    dateTime: false,
                    duration: false,
                    binary: false,
                    none: false
                },
                format: '\\$#,0;(\\$#,0);\\$#,0',
                displayName: '$ Sales__formatted',
                queryName: 'Financials.$ Sales',
                expr: {
                    _kind: 3,
                    source: {
                        _kind: 0,
                        entity: 'Financials',
                        variable: 'f',
                        kind: 0
                    },
                    ref: '$ Sales',
                    kind: 3
                },
                sort: 2,
                sortOrder: 0,
                objects: {
                    general: {
                        formatString: '\\$#,0;(\\$#,0);\\$#,0'
                    }
                },
                index: 0,
                isMeasure: true,
                aggregates: {
                    minLocal: 128067120.56999987,
                    maxLocal: 444885390.64000285
                },
                isColumn: false,
                isHighlightComponent: false,
                isExcludedFromTemplate: true,
                sourceIndex: 0
            }
        },
        values: [],
        rowsLoaded: 0
    };
    it('should correctly track fields in use from the specification', () => {
        const options = {
            spec: '{\n  "autosize": "fit",\n  "signals": [\n    {\n      "name": "pbiCrossFilterSelection",\n      "value": [],\n      "on": [\n        {\n          "events": {\n            "source": "scope",\n            "type": "mouseup",\n            "markname": "data-point"\n          },\n          "update": "pbiCrossFilterApply(event, \'datum[\\\\\'Date\\\\\'] >= _{Date}_\')"\n        },\n        {\n          "events": {\n            "source": "view",\n            "type": "mouseup",\n            "filter": [\n              "!event.item || event.item.mark.name != \'data-point\'"\n            ]\n          },\n          "update": "pbiCrossFilterClear()"\n        }\n      ]\n    }\n  ],\n  "data": [\n    {"name": "dataset"},\n    {\n      "name": "data_0",\n      "source": "dataset",\n      "transform": [\n        {"type": "formula", "expr": "toDate(datum[\\"Date\\"])", "as": "Date"},\n        {\n          "type": "filter",\n          "expr": "(isDate(datum[\\"Date\\"]) || (isValid(datum[\\"Date\\"]) && isFinite(+datum[\\"Date\\"]))) && isValid(datum[\\"$ Sales\\"]) && isFinite(+datum[\\"$ Sales\\"])"\n        }\n      ]\n    }\n  ],\n  "marks": [\n    {\n      "name": "data-point",\n      "type": "symbol",\n      "style": ["point"],\n      "from": {"data": "data_0"},\n      "encode": {\n        "update": {\n          "opacity": [\n            {"test": "datum[\'__selected__\'] != \'off\'", "value": 1},\n            {"value": 0.3}],\n          "fill": {"value": "blue"},\n          "stroke": {"value": "#4c78a8"},\n          "ariaRoleDescription": {"value": "point"},\n          "description": {\n            "signal": "\\"Date: \\" + (timeFormat(datum[\\"Date\\"], \'%b %d, %Y\')) + \\"; $ Sales: \\" + (format(datum[\\"$ Sales\\"], \\"\\"))"\n          },\n          "x": {"scale": "x", "field": "Date"},\n          "y": {"scale": "y", "field": "$ Sales"}\n        }\n      }\n    }\n  ],\n  "scales": [\n    {\n      "name": "x",\n      "type": "time",\n      "domain": {"data": "data_0", "field": "Date"},\n      "range": [0, {"signal": "width"}]\n    },\n    {\n      "name": "y",\n      "type": "linear",\n      "domain": {"data": "data_0", "field": "$ Sales"},\n      "range": [{"signal": "height"}, 0],\n      "nice": true,\n      "zero": true\n    }\n  ],\n  "axes": [\n    {\n      "scale": "x",\n      "orient": "bottom",\n      "gridScale": "y",\n      "grid": true,\n      "tickCount": {"signal": "ceil(width/40)"},\n      "domain": false,\n      "labels": false,\n      "aria": false,\n      "maxExtent": 0,\n      "minExtent": 0,\n      "ticks": false,\n      "zindex": 0\n    },\n    {\n      "scale": "y",\n      "orient": "left",\n      "gridScale": "x",\n      "grid": true,\n      "tickCount": {"signal": "ceil(height/40)"},\n      "domain": false,\n      "labels": false,\n      "aria": false,\n      "maxExtent": 0,\n      "minExtent": 0,\n      "ticks": false,\n      "zindex": 0\n    },\n    {\n      "scale": "x",\n      "orient": "bottom",\n      "grid": false,\n      "title": "Date",\n      "labelFlush": true,\n      "labelOverlap": true,\n      "tickCount": {"signal": "ceil(width/40)"},\n      "zindex": 0\n    },\n    {\n      "scale": "y",\n      "orient": "left",\n      "grid": false,\n      "title": "$ Sales",\n      "labelOverlap": true,\n      "tickCount": {"signal": "ceil(height/40)"},\n      "zindex": 0\n    }\n  ]\n}',
            dataset,
            trackedFieldsCurrent: TRACKED_FIELDS_NO_REMAP_PENDING,
            reset: false
        };
        const result = getTrackingDataFromSpecification(options);
        expect(result.trackedFields).toEqual(TRACKED_FIELDS_NO_REMAP_PENDING);
        expect(result.trackedDrilldown).toEqual({
            isCurrent: false,
            isMappingRequired: false
        });
    });
    it('should have no fields tracked if specification is empty', () => {
        const options = {
            spec: '',
            dataset,
            trackedFieldsCurrent: TRACKED_FIELDS_NO_REMAP_PENDING,
            reset: false
        };
        const result = getTrackingDataFromSpecification(options);
        expect(result.trackedFields).toEqual({});
        expect(result.trackedDrilldown).toEqual({
            isCurrent: false,
            isMappingRequired: false
        });
    });
});

describe('isExpressionField', () => {
    it('should return true for valid expression detail', () => {
        const detail = 'datum.Value >= 321';
        const result = isExpressionField(detail);
        expect(result).toBe(true);
    });

    it('should return false for expression that fails to parse (missing RHS of operation)', () => {
        const detail = 'datum.Value >=';
        const result = isExpressionField(detail);
        expect(result).toBe(false);
    });

    it('should return false for invalid expression detail', () => {
        const detail = 'This is a text string';
        const result = isExpressionField(detail);
        expect(result).toBe(false);
    });
});
