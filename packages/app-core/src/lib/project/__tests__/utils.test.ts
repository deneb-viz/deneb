import { describe, expect, it } from 'vitest';
import { type UsermetaDatasetField } from '@deneb-viz/data-core/field';

import { remapSupportFieldConfigurationForImport } from '../utils';

/**
 * Relocated from `@deneb-viz/json-processing`'s `template-usermeta.test.ts`
 * (2026-07-15, remediation WP8/#16) alongside the function itself. The
 * original suite also had a fourth case exercising a round-trip through
 * json-processing's `getPublishableUsermeta` (export) followed by this
 * function (import); that scenario tested `getPublishableUsermeta`'s own
 * behavior as much as this function's, so it stays covered by
 * json-processing's suite and is not duplicated here. The case below
 * covers the same shape of config (including `treatAsParameter` and
 * `names` flags) purely from this function's point of view.
 */
describe('remapSupportFieldConfigurationForImport', () => {
    it('should extract inline config from dataset entries keyed by suppliedObjectName', () => {
        const dataset: UsermetaDatasetField[] = [
            {
                key: '__dataset.0__',
                name: 'Date',
                suppliedObjectName: 'Order Date',
                kind: 'column',
                type: 'dateTime',
                supportFieldConfiguration: {
                    highlight: true,
                    highlightStatus: false,
                    highlightComparator: false,
                    format: false,
                    formatted: false
                }
            },
            {
                key: '__dataset.1__',
                name: '$ Sales',
                suppliedObjectName: 'Revenue',
                kind: 'measure',
                type: 'numeric',
                supportFieldConfiguration: {
                    highlight: false,
                    highlightStatus: false,
                    highlightComparator: false,
                    format: true,
                    formatted: true
                }
            }
        ];

        const result = remapSupportFieldConfigurationForImport(dataset);

        expect(result).toEqual({
            'Order Date': {
                highlight: true,
                highlightStatus: false,
                highlightComparator: false,
                format: false,
                formatted: false
            },
            Revenue: {
                highlight: false,
                highlightStatus: false,
                highlightComparator: false,
                format: true,
                formatted: true
            }
        });
    });

    it('should return empty object for empty dataset', () => {
        const result = remapSupportFieldConfigurationForImport([]);
        expect(result).toEqual({});
    });

    it('should skip fields without supportFieldConfiguration', () => {
        const dataset: UsermetaDatasetField[] = [
            {
                key: '__dataset.0__',
                name: 'Date',
                suppliedObjectName: 'Order Date',
                kind: 'column',
                type: 'dateTime'
            }
        ];

        const result = remapSupportFieldConfigurationForImport(dataset);
        expect(result).toEqual({});
    });

    it('should skip fields without suppliedObjectName', () => {
        const dataset: UsermetaDatasetField[] = [
            {
                key: '__dataset.0__',
                name: 'Date',
                kind: 'column',
                type: 'dateTime',
                supportFieldConfiguration: {
                    highlight: true,
                    highlightStatus: false,
                    highlightComparator: false,
                    format: false,
                    formatted: false
                }
            }
        ];

        const result = remapSupportFieldConfigurationForImport(dataset);
        expect(result).toEqual({});
    });

    it('should preserve treatAsParameter and names flags', () => {
        const dataset: UsermetaDatasetField[] = [
            {
                key: '__dataset.2__',
                name: 'Category Parameter',
                suppliedObjectName: 'Region Parameter',
                kind: 'parameter',
                type: 'other',
                supportFieldConfiguration: {
                    highlight: false,
                    highlightStatus: false,
                    highlightComparator: false,
                    format: false,
                    formatted: false,
                    treatAsParameter: true,
                    names: true
                }
            }
        ];

        const result = remapSupportFieldConfigurationForImport(dataset);

        expect(result).toEqual({
            'Region Parameter': {
                highlight: false,
                highlightStatus: false,
                highlightComparator: false,
                format: false,
                formatted: false,
                treatAsParameter: true,
                names: true
            }
        });
    });
});

describe('remapSupportFieldConfigurationForImport — partial template config (#755)', () => {
    it('should normalize a partial config to the full flag set with missing flags off', () => {
        const dataset: UsermetaDatasetField[] = [
            {
                key: '__dataset.0__',
                name: 'Metric Fields',
                suppliedObjectName: 'Metric Fields',
                kind: 'parameter',
                type: 'other',
                supportFieldConfiguration: {
                    format: true,
                    formatted: true,
                    names: true
                }
            }
        ];
        expect(remapSupportFieldConfigurationForImport(dataset)).toEqual({
            'Metric Fields': {
                highlight: false,
                highlightStatus: false,
                highlightComparator: false,
                format: true,
                formatted: true,
                names: true
            }
        });
    });
});
