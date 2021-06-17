import powerbi from 'powerbi-visuals-api';
import DataViewMetadataColumn = powerbi.DataViewMetadataColumn;
import ValueTypeDescriptor = powerbi.ValueTypeDescriptor;

import {
    ITemplateDatasetField,
    TDatasetFieldType
} from '../../schema/template-v1';
import { updateTemplateExportState } from '../../store/templateReducer';

import { getState, getStore } from '../store/public';
import { TTemplateExportState } from './public';
import { updateExportError } from './private';

export const resolveValueDescriptor = (
    type: ValueTypeDescriptor
): TDatasetFieldType => {
    switch (true) {
        case type?.bool:
            return 'bool';
        case type?.text:
            return 'text';
        case type?.numeric:
            return 'numeric';
        case type?.dateTime:
            return 'dateTime';
        default:
            return 'other';
    }
};

export const resolveVisualMetaToDatasetField = (
    metadata: DataViewMetadataColumn,
    encodedName: string
): ITemplateDatasetField => {
    return {
        key: metadata.queryName,
        name: encodedName,
        namePlaceholder: encodedName,
        description: '',
        kind: (metadata.isMeasure && 'measure') || 'column',
        type: resolveValueDescriptor(metadata.type)
    };
};

export const updateExportState = (state: TTemplateExportState) => {
    getStore().dispatch(updateTemplateExportState(state));
};

export const validateSpecificationForExport = () => {
    const { spec } = getState().visual;
    updateExportState('Validating');
    if (spec.status === 'valid') {
        updateExportState('Editing');
    } else {
        updateExportError('Template_Export_Bad_Spec');
    }
};
