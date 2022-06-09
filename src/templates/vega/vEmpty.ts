import { Spec } from 'vega';
import {
    authorInfo,
    getVegaTemplateSpecificConfig,
    vegaDataModelRef,
    vegaProviderInfo
} from '../common';

export const vEmpty: Spec = {
    $schema: vegaProviderInfo,
    data: [vegaDataModelRef()],
    config: getVegaTemplateSpecificConfig(),
    marks: [],
    usermeta: {
        information: {
            name: '[empty]',
            description:
                'Bare-minimum Vega template, with data-binding pre-populated.',
            author: authorInfo,
            uuid: '0fa47171-78c0-4a38-8ac4-388432894975',
            generated: '2021-03-26T00:00:00.000Z'
        },
        provider: 'vega',
        dataset: []
    }
};
