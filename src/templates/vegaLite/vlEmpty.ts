import { IVegaLiteTemplate } from '../../types';
import { autoSizeConfigSimple, vegaDataModelRef } from '..';

export const vlEmpty: IVegaLiteTemplate = {
    name: '[empty]',
    description:
        'Bare-minimum Vega-Lite template, with data-binding pre-populated.',
    spec: {
        data: vegaDataModelRef(),
        mark: null
    },
    config: {
        autosize: autoSizeConfigSimple()
    }
};
