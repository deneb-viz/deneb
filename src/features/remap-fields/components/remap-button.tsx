import React from 'react';
import { Button } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { getI18nValue } from '../../i18n';
import store, { getState } from '../../../store';
import { logDebug, logRender } from '../../logging';
import { persistSpecification } from '../../specification';
import {
    IEditorRefs,
    setFocusToActiveEditor,
    useJsonEditorContext
} from '../../json-editor';
import { RemapState } from '@deneb-viz/core-dependencies';
import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';
import {
    updateFieldTokenization,
    getRemappedSpecification
} from '../../json-processing';
import { type TrackedFields } from '@deneb-viz/json-processing/field-tracking';

/**
 * Button for applying field mapping changes via the modal dialog.
 */
export const RemapButton: React.FC = () => {
    const editorRefs = useJsonEditorContext();
    const {
        dataset,
        jsonSpec,
        remapAllDependenciesAssigned,
        remapFields,
        remapState
    } = store(
        (state) => ({
            dataset: state.fieldUsage.dataset,
            jsonSpec: state.visualSettings.vega.output.jsonSpec.value,
            remapAllDependenciesAssigned:
                state.fieldUsage.remapAllDependenciesAssigned,
            remapFields: state.fieldUsage.remapFields,
            remapState: state.interface.remapState
        }),
        shallow
    );
    const onRemap = () => {
        applyRemappedFields(jsonSpec, remapFields, dataset, editorRefs);
    };
    logRender('RemapButton');
    return (
        <Button
            disabled={
                !remapAllDependenciesAssigned || remapState !== RemapState.None
            }
            appearance='primary'
            onClick={onRemap}
        >
            {getI18nValue('Button_Remap')}
        </Button>
    );
};

/**
 * For the supplied tokenized specification and re-mapping information, traverse all re-mapping fields needed and
 * replace the placeholder with the supplied object name. When done, this is persisted to the store.
 */
export const applyRemappedFields = async (
    specification: string,
    remapFields: UsermetaDatasetField[],
    trackedFields: TrackedFields,
    editorRefs: IEditorRefs
) => {
    logDebug('[applyRemappedFields] called', {
        specification,
        remapFields,
        tracking: trackedFields
    });
    const { spec, config } = editorRefs;
    const {
        fieldUsage: { applyFieldMapping },
        interface: { setRemapState }
    } = getState();
    const cursorPrev = editorRefs?.spec?.current.getPosition();
    setRemapState(RemapState.Tokenizing);
    await updateFieldTokenization(specification, trackedFields);
    const {
        fieldUsage: { tokenizedSpec }
    } = getState();
    logDebug('[applyRemappedFields] tokenized spec', { tokenizedSpec });
    setRemapState(RemapState.Replacing);
    const mappedSpec = await getRemappedSpecification(
        tokenizedSpec,
        remapFields,
        trackedFields
    );
    logDebug('[applyRemappedFields] mapped spec', {
        trackedFields,
        mappedSpec
    });
    setRemapState(RemapState.Tracking);
    // Make sure that we get the new tracking data, but reset the original (otherwise we'll loop)
    // Tracking is now only used for export (#486)
    // await updateFieldTracking(mappedSpec, trackedFields, true);
    const {
        fieldUsage: { dataset, drilldown }
    } = getState();
    logDebug('[applyRemappedFields] after updated tracking', {
        dataset,
        drilldown,
        mappedSpec
    });
    applyFieldMapping({
        dataset,
        drilldown
    });
    // Assign new spec and clear selection
    setRemapState(RemapState.UpdatingEditor);
    spec?.current?.setValue(mappedSpec);
    spec?.current?.setPosition(cursorPrev);
    setFocusToActiveEditor(editorRefs);
    setRemapState(RemapState.Complete);
    persistSpecification(spec.current, config.current);
    setRemapState(RemapState.None);
};
