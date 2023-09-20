import React from 'react';

import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';
import { useModalDialogStyles } from '../../modal-dialog';
import { PREVIEW_IMAGE_CAP_SIZE, TemplateDataset } from '../../template';
import { VisualExportInformation } from './visual-export-information';
import { Subtitle2 } from '@fluentui/react-components';

/**
 * Interface (pane) for exporting a existing visualization.
 */
export const VisualExportPane: React.FC = () => {
    const classes = useModalDialogStyles();
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
                        PREVIEW_IMAGE_CAP_SIZE,
                        PREVIEW_IMAGE_CAP_SIZE
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
                    <div className={classes.paneContentSection}>
                        <div className={classes.paneContentHeading}>
                            <Subtitle2>
                                {getI18nValue('Template_Export_Dataset')}
                            </Subtitle2>
                        </div>
                        <TemplateDataset datasetRole='export' />
                    </div>
                </div>
            </div>
        </div>
    );
};
