import React from 'react';
import { Button } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { getI18nValue } from '../../i18n';
import store, { getState } from '../../../store';
import { logDebug, logRender } from '../../logging';
import { persistSpecification } from '../../specification';
import { useJsonEditorContext } from '../../json-editor';
import { IAceEditor } from 'react-ace/lib/types';
import {
    TrackedFields,
    UsermetaDatasetField
} from '@deneb-viz/core-dependencies';
import {
    getFieldsInUseFromSpecification,
    getRemappedSpecification
} from '@deneb-viz/json-processing';

/**
 * Button for applying field mapping changes via the modal dialog.
 */
export const RemapButton: React.FC = () => {
    const { spec, config } = useJsonEditorContext();
    const {
        dataset,
        remapAllDependenciesAssigned,
        remapFields,
        tokenizedSpec
    } = store(
        (state) => ({
            dataset: state.fieldUsage.dataset,
            remapAllDependenciesAssigned:
                state.fieldUsage.remapAllDependenciesAssigned,
            remapFields: state.fieldUsage.remapFields,
            tokenizedSpec: state.fieldUsage.tokenizedSpec
        }),
        shallow
    );
    spec.current.editor;
    const onRemap = () => {
        applyRemappedFields(
            tokenizedSpec,
            remapFields,
            dataset,
            spec.current.editor,
            config.current.editor
        );
    };
    logRender('RemapButton');
    return (
        <Button
            disabled={!remapAllDependenciesAssigned}
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
export const applyRemappedFields = (
    specification: string,
    remapFields: UsermetaDatasetField[],
    trackedFields: TrackedFields,
    specEditor: IAceEditor,
    configEditor: IAceEditor
) => {
    logDebug('applyRemappedFields', {
        specification,
        remapFields,
        tracking: trackedFields
    });
    const cursorPrev = specEditor.getCursorPosition();
    const {
        dataset,
        fieldUsage: { applyFieldMapping }
    } = getState();
    const mappedSpec = getRemappedSpecification({
        specification,
        remapFields,
        trackedFields
    });
    // Assign new spec and clear selection
    specEditor?.setValue(mappedSpec);
    specEditor?.clearSelection();
    specEditor?.moveCursorToPosition(cursorPrev);
    // Make sure that we get the new tracking data, but reset the original
    const trackingUpdated = getFieldsInUseFromSpecification({
        spec: mappedSpec,
        dataset,
        trackedFieldsCurrent: trackedFields,
        reset: true
    });
    applyFieldMapping({
        dataset: trackingUpdated.trackedFields,
        drilldown: trackingUpdated.trackedDrilldown,
        jsonSpec: specification
    });
    persistSpecification(specEditor, configEditor);
};
