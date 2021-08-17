export {
    ITemplateSliceState,
    IPlaceholderValuePayload,
    ITemplateImportErrorPayload,
    ITemplateExportFieldUpdatePayload,
    ITemplateImportPayload,
    initialState
};

import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';
import { ErrorObject } from 'ajv';

import { IDenebTemplateMetadata } from '../../core/template/schema';

import {
    TExportOperation,
    TTemplateExportState,
    TTemplateImportState,
    TTemplateProvider
} from '../../core/template';
import templates from '../../templates';
import { TSpecProvider } from '../../core/vega';

interface ITemplateSliceState {
    selectedTemplateIndex: number;
    templateFile: File;
    templateImportState: TTemplateImportState;
    templateExportState: TTemplateExportState;
    templateImportErrorMessage: string;
    templateExportErrorMessage: string;
    templateSchemaErrors: ErrorObject[];
    templateFileRawContent: string;
    templateToApply: Spec | TopLevelSpec;
    templateExportMetadata: IDenebTemplateMetadata;
    allImportCriteriaApplied: boolean;
    allExportCriteriaApplied: boolean;
    templateProvider: TTemplateProvider;
    specProvider: TSpecProvider;
    selectedExportOperation: TExportOperation;
    vegaLite: TopLevelSpec[];
    vega: Spec[];
}

interface IPlaceholderValuePayload {
    key: string;
    objectName: string;
}

interface ITemplateImportErrorPayload {
    templateImportErrorMessage: string;
    templateSchemaErrors: ErrorObject[];
}

interface ITemplateExportFieldUpdatePayload {
    selector: string;
    value: string;
}

interface ITemplateImportPayload {
    templateFile: File;
    templateFileRawContent: string;
    templateToApply: Spec | TopLevelSpec;
    provider?: TSpecProvider;
}

const initialState: ITemplateSliceState = {
    ...{
        allImportCriteriaApplied: false,
        allExportCriteriaApplied: false,
        templateFile: null,
        templateImportState: 'None',
        templateExportState: 'None',
        templateImportErrorMessage: null,
        templateExportErrorMessage: null,
        templateSchemaErrors: [],
        templateFileRawContent: null,
        templateToApply: templates.vegaLite[0],
        templateExportMetadata: null,
        selectedTemplateIndex: 0,
        selectedExportOperation: 'information',
        specProvider: 'vegaLite',
        templateProvider: 'vegaLite'
    },
    ...templates
};
