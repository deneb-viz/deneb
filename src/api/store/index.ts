export { getState, store, ITemplateSliceState };

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { TopLevelSpec } from 'vega-lite';
import { Spec } from 'vega';
import { ErrorObject } from 'ajv';

import visualReducer from '../../store/visualReducer';
import templateReducer from '../../store/templateReducer';
import zoomReducer from '../../store/zoomReducer';

import { IDenebTemplateMetadata } from '../../schema/template-v1';

import { TSpecProvider } from '../specification';
import {
    TExportOperation,
    TTemplateExportState,
    TTemplateImportState,
    TTemplateProvider
} from '../template';

const getNewStore = () => {
    const reducer = combineReducers({
        visual: visualReducer,
        templates: templateReducer(),
        zoom: zoomReducer
    });
    return configureStore({
        reducer
    });
};

const store = getNewStore();

const getState = () => store.getState();

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
