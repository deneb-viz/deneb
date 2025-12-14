import React from 'react';
import { Button } from '@fluentui/react-components';

import { type UsermetaDatasetField } from '@deneb-viz/template-usermeta';
import { type TrackedFields } from '@deneb-viz/json-processing/field-tracking';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import {
    type SpecificationEditorRefs,
    useSpecificationEditor
} from '../../specification-editor';
import { getDenebState, useDenebState } from '../../../state';
import { updateFieldTokenization } from '../../../lib/field-processing';
import { getRemappedSpecification } from '../../../lib/field-processing/tokenization';
import {
    handlePersistSpecification,
    handleSetFocusToActiveEditor
} from '../../../lib';

/**
 * Button for applying field mapping changes via the modal dialog.
 */
export const FieldRemapButton = () => {
    const editorRefs = useSpecificationEditor();
    const {
        dataset,
        jsonSpec,
        remapAllDependenciesAssigned,
        remapFields,
        remapState
    } = useDenebState((state) => ({
        dataset: state.fieldUsage.dataset,
        jsonSpec: state.visualSettings.vega.output.jsonSpec.value,
        remapAllDependenciesAssigned:
            state.fieldUsage.remapAllDependenciesAssigned,
        remapFields: state.fieldUsage.remapFields,
        remapState: state.interface.remapState
    }));
    const onRemap = () => {
        applyRemappedFields(jsonSpec, remapFields, dataset, editorRefs);
    };
    logRender('RemapButton');
    return (
        <Button
            disabled={!remapAllDependenciesAssigned || remapState !== 'None'}
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
    editorRefs: SpecificationEditorRefs
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
    } = getDenebState();
    const cursorPrev = editorRefs?.spec?.current?.getPosition();
    setRemapState('Tokenizing');
    await updateFieldTokenization(specification, trackedFields);
    const {
        fieldUsage: { tokenizedSpec }
    } = getDenebState();
    logDebug('[applyRemappedFields] tokenized spec', { tokenizedSpec });
    setRemapState('Replacing');
    const mappedSpec = await getRemappedSpecification(
        tokenizedSpec,
        remapFields,
        trackedFields
    );
    logDebug('[applyRemappedFields] mapped spec', {
        trackedFields,
        mappedSpec
    });
    setRemapState('Tracking');
    // Make sure that we get the new tracking data, but reset the original (otherwise we'll loop)
    // Tracking is now only used for export (#486)
    // await updateFieldTracking(mappedSpec, trackedFields, true);
    const {
        fieldUsage: { dataset, drilldown }
    } = getDenebState();
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
    setRemapState('UpdatingEditor');
    spec?.current?.setValue(mappedSpec);
    if (cursorPrev) {
        spec?.current?.setPosition(cursorPrev);
    }
    handleSetFocusToActiveEditor(editorRefs);
    setRemapState('Complete');
    handlePersistSpecification(spec.current, config.current);
    setRemapState('None');
};
