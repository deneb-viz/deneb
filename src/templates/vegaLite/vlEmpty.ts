import { TopLevelSpec } from 'vega-lite';
import { authorInfo, vegaDataModelRef, vegaLiteProviderInfo } from '..';

export const vlEmpty: TopLevelSpec = {
    $schema: vegaLiteProviderInfo,
    data: vegaDataModelRef(),
    config: {},
    mark: null,
    usermeta: {
        information: {
            name: '[empty]',
            description:
                'Bare-minimum Vega-Lite template, with data-binding pre-populated.',
            author: authorInfo,
            uuid: 'e1350bd2-88e7-44b0-9231-346143623f77',
            generated: '2021-03-26T00:00:00.000Z'
        },
        provider: 'vegaLite'
    }
};
