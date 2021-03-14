import { IVegaTemplate } from '../../types';
import { autoSizeConfigSimple, vegaDataModelRef } from '..';

export const vEmpty: IVegaTemplate = {
    name: '[empty]',
    description: 'Bare-minimum Vega template, with data-binding pre-populated.',
    spec: {
        data: [vegaDataModelRef()],
        marks: []
    },
    config: {
        autosize: autoSizeConfigSimple()
    }
};
