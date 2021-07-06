import powerbi from 'powerbi-visuals-api';
import ISelectionId = powerbi.visuals.ISelectionId;

import jsonrepair from 'jsonrepair';

import { updateFixStatus, updateSpec } from '../../store/visualReducer';

import { getConfig } from '../config';
import {
    configEditorService,
    specEditorService,
    TEditorRole
} from '../editor/public';
import { isFeatureEnabled } from '../features/public';
import { getHostLM } from '../i18n/public';
import { getSidString } from '../selection/public';
import { getState, getStore } from '../store/public';
import {
    getBaseValidator,
    indentJson,
    ICompiledSpec,
    IFixStatus,
    IFixResult
} from './public';

export const propertyDefaults = getConfig().propertyDefaults.vega;

export const cleanJsonInputForPersistence = (
    operation: TEditorRole,
    input: string
): string => {
    const clean = input.trim();
    if (clean === '') {
        switch (operation) {
            case 'spec':
                return propertyDefaults.jsonSpec;
            case 'config':
                return propertyDefaults.jsonConfig;
        }
    }
    return clean;
};

export const dispatchFixStatus = (result: IFixResult) => {
    getStore().dispatch(updateFixStatus(result));
};

export const dispatchSpec = (compiledSpec: ICompiledSpec) => {
    getStore().dispatch(updateSpec(compiledSpec));
};

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

export const getCleanEditorJson = (role: TEditorRole) =>
    cleanJsonInputForPersistence(
        role,
        role === 'spec'
            ? specEditorService.getText()
            : configEditorService.getText()
    );

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
    operation: TEditorRole,
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
