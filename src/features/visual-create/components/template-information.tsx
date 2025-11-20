import { Body1, Caption1, Subtitle2 } from '@fluentui/react-components';
import React from 'react';
import { shallow } from 'zustand/shallow';

import { useCreateStyles } from './';
import store from '../../../store';
import { logDebug, logRender } from '../../logging';
import { getI18nValue } from '../../i18n';
import { isBase64Image } from '@deneb-viz/utils/base64';
import {
    PreviewImage,
    TemplateDataset,
    TemplatePlaceholderMessage
} from '@deneb-viz/app-core';

/**
 * Displays the information and placeholders for a template.
 */
export const TemplateInformation: React.FC = () => {
    const { metadata } = store(
        (state) => ({
            metadata: state.create.metadata
        }),
        shallow
    );
    if (!metadata) return null;
    const classes = useCreateStyles();
    const { previewImageBase64PNG } = metadata?.information || {};
    const isValid =
        (previewImageBase64PNG && isBase64Image(previewImageBase64PNG)) ||
        false;
    const dataUri = isValid ? previewImageBase64PNG : '';
    logDebug('Image', { previewImageBase64PNG, isValid, dataUri });
    logRender('TemplateInformation');
    return (
        <>
            <div className={classes.templateInformationHeader}>
                <div className={classes.templateInformationContent}>
                    <div className={classes.templateTitle}>
                        <Subtitle2>{metadata.information.name}</Subtitle2>{' '}
                        <Caption1>
                            {getI18nValue('Text_Template_By')}{' '}
                            {metadata.information.author ||
                                getI18nValue('Text_Template_No_Author')}
                        </Caption1>
                    </div>
                    <div>
                        <Body1>
                            {metadata.information.description ||
                                getI18nValue('Text_Template_No_Description')}
                        </Body1>
                    </div>
                    <TemplatePlaceholderMessage />
                </div>
                <div className={classes.templatePreviewImageContainer}>
                    <PreviewImage isValid={isValid} dataUri={dataUri} />
                </div>
            </div>
            <TemplateDataset
                datasetRole='new'
                key={metadata?.information?.uuid}
            />
        </>
    );
};
