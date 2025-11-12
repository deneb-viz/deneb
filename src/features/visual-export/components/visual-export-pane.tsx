import React, { useEffect } from 'react';
import { shallow } from 'zustand/shallow';

import { logDebug, logRender } from '../../logging';
import { getI18nValue } from '../../i18n';
import { useModalDialogStyles } from '../../modal-dialog';
import { TemplateDataset } from '../../template';
import { VisualExportInformation } from './visual-export-information';
import { Subtitle2 } from '@fluentui/react-components';
import { TEMPLATE_PREVIEW_IMAGE_MAX_SIZE } from '../../../../config';
import { StageProgressIndicator } from '../../modal-dialog';
import store, { getState } from '../../../store';
import { TemplateExportProcessingState } from '@deneb-viz/json-processing/template-processing';
import {
    updateFieldTokenization,
    updateFieldTracking
} from '../../json-processing';

/**
 * Interface (pane) for exporting a existing visualization.
 */
export const VisualExportPane: React.FC = () => {
    const classes = useModalDialogStyles();
    const { exportProcessingState } = store(
        (state) => ({
            exportProcessingState: state.interface.exportProcessingState
        }),
        shallow
    );
    useEffect(() => {
        handleProcessing();
    }, []);
    logRender('VisualExportPane');
    return (
        <div className={classes.paneRoot}>
            <div className={classes.paneMenu}>
                <div className={classes.paneAssistiveText}>
                    {getI18nValue('Text_Overview_Export_1')}
                </div>
                <div className={classes.paneAssistiveText}>
                    {getI18nValue('Text_Overview_Export_2')}
                </div>
                <div className={classes.paneAssistiveText}>
                    {getI18nValue('Text_Overview_Export_3', [
                        TEMPLATE_PREVIEW_IMAGE_MAX_SIZE,
                        TEMPLATE_PREVIEW_IMAGE_MAX_SIZE
                    ])}
                </div>
                <div className={classes.paneAssistiveText}>
                    {getI18nValue('Text_Overview_Export_4', [
                        getI18nValue('Text_Button_Download')
                    ])}
                </div>
            </div>
            <div className={classes.paneContent}>
                <div className={classes.paneContentScrollable}>
                    <VisualExportInformation />
                    {exportProcessingState ===
                        TemplateExportProcessingState.Tokenizing && (
                        <div className={classes.paneContentSection}>
                            <StageProgressIndicator
                                message={getI18nValue('Text_Export_Tokenizing')}
                                isInProgress={
                                    exportProcessingState ===
                                    TemplateExportProcessingState.Tokenizing
                                }
                                isCompleted={
                                    exportProcessingState >
                                    TemplateExportProcessingState.Tokenizing
                                }
                            />
                        </div>
                    )}
                    {exportProcessingState ===
                        TemplateExportProcessingState.Complete && (
                        <div className={classes.paneContentSection}>
                            <div className={classes.paneContentHeading}>
                                <Subtitle2>
                                    {getI18nValue('Template_Export_Dataset')}
                                </Subtitle2>
                            </div>
                            <TemplateDataset datasetRole='export' />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Do the necessary work to process the spec for the template fields when the dialog is loaded.
 */
const handleProcessing = async () => {
    const {
        fieldUsage: { dataset },
        interface: { setExportProcessingState },
        visualSettings: {
            vega: {
                output: {
                    jsonSpec: { value: jsonSpec }
                }
            }
        }
    } = getState();
    setExportProcessingState(TemplateExportProcessingState.Tokenizing);
    await updateFieldTracking(jsonSpec, dataset);
    const {
        fieldUsage: { dataset: trackedFieldsCurrent }
    } = getState();
    logDebug('[handleProcessing] trackedFieldsCurrent', {
        trackedFieldsInitial: dataset,
        trackedFieldsCurrent
    });
    await updateFieldTokenization(jsonSpec, trackedFieldsCurrent);
    setExportProcessingState(TemplateExportProcessingState.Complete);
};
