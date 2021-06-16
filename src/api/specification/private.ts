import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;

import Ajv from 'ajv';
import * as draft06 from 'ajv/lib/refs/json-schema-draft-06.json';
import jsonrepair from 'jsonrepair';

import { TEditorOperation } from '../../types';
import { vegaSettingsDefaults } from '../../config';
import { updateFixStatus, updateSpec } from '../../store/visualReducer';

import { isFeatureEnabled } from '../features/public';
import { getHostLM } from '../i18n/public';
import { getSidString } from '../selection/public';
import { getState, getStore } from '../store/public';
import { indentJson, ICompiledSpec, IFixStatus, IFixResult } from './public';

export const cleanJsonInputForPersistence = (
    operation: TEditorOperation,
    input: string
): string => {
    const clean = input.trim();
    if (clean === '') {
        switch (operation) {
            case 'spec':
                return vegaSettingsDefaults.jsonSpec;
            case 'config':
                return vegaSettingsDefaults.jsonConfig;
        }
    }
    return clean;
};

export const dispatchFixStatus = (result: IFixResult) =>
    getStore().dispatch(updateFixStatus(result));

export const dispatchSpec = (compiledSpec: ICompiledSpec) =>
    getStore().dispatch(updateSpec(compiledSpec));

export const getBaseValidator = () =>
    new Ajv({}).addFormat('color-hex', () => true).addMetaSchema(draft06);

export const getExistingSelectors = () => {
    const { dataset, selectionManager } = getState().visual;
    return (
        (selectionManager.hasSelection() &&
            selectionManager
                .getSelectionIds()
                .map(
                    (id: ISelectionId) =>
                        dataset.values.find(
                            (v) =>
                                getSidString(v.__identity__) ===
                                getSidString(id)
                        )?.__key__
                )
                .filter((k) => k !== undefined)
                .map((k) => ({
                    __key__: k
                }))) ||
        undefined
    );
};

export const getSchemaValidator = (schema: Object) =>
    getBaseValidator().compile(schema);

export const resolveFixErrorMessage = (
    success: boolean,
    fixedRawSpec: IFixStatus,
    fixedRawConfig: IFixStatus
): string => {
    const i18n = getHostLM();
    return (
        (!success &&
            `${i18n.getDisplayName('Fix_Failed_Prefix')} ${
                fixedRawSpec.error || ''
            }${
                (!fixedRawSpec.success && !fixedRawConfig.success && ' & ') ||
                ''
            }${fixedRawConfig.error || ''}. ${i18n.getDisplayName(
                'Fix_Failed_Suffix'
            )}`) ||
        undefined
    );
};

export const resolveUrls = (content: string) =>
    (!isFeatureEnabled('enableExternalUri') &&
        content.replace(
            /\b(?!data:)((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/g,
            ''
        )) ||
    content;

export const tryFixAndFormat = (
    operation: TEditorOperation,
    input: string
): IFixStatus => {
    const lm = getHostLM();
    try {
        return {
            success: true,
            text: indentJson(JSON.parse(jsonrepair(input)))
        };
    } catch (e) {
        return {
            success: false,
            text: input,
            error: `${lm.getDisplayName(
                operation === 'spec' ? 'Editor_Role_Spec' : 'Editor_Role_Config'
            )} ${lm.getDisplayName('Fix_Failed_Item')}`
        };
    }
};
