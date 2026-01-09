import { useEffect } from 'react';
import { Subtitle2 } from '@fluentui/react-components';

import { TEMPLATE_PREVIEW_IMAGE_MAX_SIZE } from '@deneb-viz/configuration';
import { logDebug, logRender } from '@deneb-viz/utils/logging';
import {
    StageProgressIndicator,
    useModalDialogStyles
} from '../../../components/ui';
import { getDenebState, useDenebState } from '../../../state';
import { ExportInformation } from './export-information';
import { TemplateDataset } from '../../../components/template-metadata';
import {
    updateFieldTokenization,
    updateFieldTracking
} from '../../../lib/field-processing';

/**
 * Interface (pane) for exporting a existing visualization.
 */
export const ExportPane = () => {
    const classes = useModalDialogStyles();
    const { exportProcessingState, translate } = useDenebState((state) => ({
        exportProcessingState: state.interface.exportProcessingState,
        translate: state.i18n.translate
    }));
    useEffect(() => {
        handleProcessing();
    }, []);
    logRender('VisualExportPane');
    return (
        <div className={classes.paneRoot}>
            <div className={classes.paneMenu}>
                <div className={classes.paneAssistiveText}>
                    {translate('Text_Overview_Export_1')}
                </div>
                <div className={classes.paneAssistiveText}>
                    {translate('Text_Overview_Export_2')}
                </div>
                <div className={classes.paneAssistiveText}>
                    {translate('Text_Overview_Export_3', [
                        TEMPLATE_PREVIEW_IMAGE_MAX_SIZE,
                        TEMPLATE_PREVIEW_IMAGE_MAX_SIZE
                    ])}
                </div>
                <div className={classes.paneAssistiveText}>
                    {translate('Text_Overview_Export_4', [
                        translate('Button_Download')
                    ])}
                </div>
            </div>
            <div className={classes.paneContent}>
                <div className={classes.paneContentScrollable}>
                    <ExportInformation />
                    {exportProcessingState === 'Tokenizing' && (
                        <div className={classes.paneContentSection}>
                            <StageProgressIndicator
                                message={translate('Text_Export_Tokenizing')}
                                isInProgress={
                                    exportProcessingState === 'Tokenizing'
                                }
                                isCompleted={
                                    exportProcessingState > 'Tokenizing'
                                }
                            />
                        </div>
                    )}
                    {exportProcessingState === 'Complete' && (
                        <div className={classes.paneContentSection}>
                            <div className={classes.paneContentHeading}>
                                <Subtitle2>
                                    {translate('Template_Export_Dataset')}
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
        project: { spec }
    } = getDenebState();
    setExportProcessingState('Tokenizing');
    await updateFieldTracking(spec, dataset);
    const {
        fieldUsage: { dataset: trackedFieldsCurrent }
    } = getDenebState();
    logDebug('[handleProcessing] trackedFieldsCurrent', {
        trackedFieldsInitial: dataset,
        trackedFieldsCurrent
    });
    await updateFieldTokenization(spec, trackedFieldsCurrent);
    setExportProcessingState('Complete');
};
