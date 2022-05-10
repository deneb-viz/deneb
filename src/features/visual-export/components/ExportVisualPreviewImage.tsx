import React from 'react';

import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { Separator } from '@fluentui/react/lib/Separator';
import { Stack, StackItem, IStackTokens } from '@fluentui/react/lib/Stack';

import { Paragraph } from '../../../components/elements/Typography';
import store from '../../../store';
import { i18nValue } from '../../../core/ui/i18n';
import { isFeatureEnabled } from '../../../core/utils/features';
import { reactLog } from '../../../core/utils/reactLog';
import {
    dispatchPreviewImage,
    PreviewImage,
    PREVIEW_IMAGE_CAP_SIZE
} from '../../template';

const stackTokens: IStackTokens = {
    childrenGap: 25
};

export const ExportVisualPreviewImage: React.FC = () => {
    const { templatePreviewImageDataUri, templateIncludePreviewImage } = store(
        (state) => state
    );
    const onChange = React.useCallback(
        (
            ev?: React.FormEvent<HTMLElement | HTMLInputElement>,
            checked?: boolean
        ): void => {
            dispatchPreviewImage(!!checked);
        },
        []
    );
    reactLog('Rendering [TemplateExportPreviewImage]');
    return isFeatureEnabled('templateExportPreviewImages') ? (
        <>
            <Separator />
            <Stack horizontal tokens={stackTokens}>
                <StackItem disableShrink>
                    <Checkbox
                        label={i18nValue(
                            'Template_Export_Include_Preview_Image'
                        )}
                        checked={templateIncludePreviewImage}
                        onChange={onChange}
                    />
                </StackItem>
                <StackItem shrink>
                    <PreviewImage
                        isValid={true}
                        dataUri={templatePreviewImageDataUri}
                    />
                </StackItem>
                <StackItem grow>
                    {templateIncludePreviewImage && (
                        <Paragraph>
                            {i18nValue(
                                'Template_Export_IncludePreview_Image_Disclaimer_Para1',
                                [PREVIEW_IMAGE_CAP_SIZE, PREVIEW_IMAGE_CAP_SIZE]
                            )}
                            <br />
                            <br />
                            <strong>
                                {i18nValue(
                                    'Template_Export_IncludePreview_Image_Disclaimer_Para2'
                                )}
                                <ul>
                                    <li>
                                        {i18nValue(
                                            'Template_Export_IncludePreview_Image_Disclaimer_Point1'
                                        )}
                                    </li>
                                    <li>
                                        {i18nValue(
                                            'Template_Export_IncludePreview_Image_Disclaimer_Point2'
                                        )}
                                    </li>
                                </ul>

                                {i18nValue(
                                    'Template_Export_IncludePreview_Image_Disclaimer_Suffix'
                                )}
                            </strong>
                        </Paragraph>
                    )}
                </StackItem>
            </Stack>
        </>
    ) : (
        <></>
    );
};
