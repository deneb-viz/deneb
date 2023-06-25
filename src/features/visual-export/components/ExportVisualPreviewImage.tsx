import React from 'react';

import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { Separator } from '@fluentui/react/lib/Separator';
import { Stack, StackItem, IStackTokens } from '@fluentui/react/lib/Stack';

import { Paragraph } from '../../../components/elements/Typography';
import store from '../../../store';
import { isFeatureEnabled } from '../../../core/utils/features';
import {
    dispatchPreviewImage,
    PreviewImage,
    PREVIEW_IMAGE_CAP_SIZE
} from '../../template';
import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';

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
    logRender('TemplateExportPreviewImage');
    return isFeatureEnabled('templateExportPreviewImages') ? (
        <>
            <Separator />
            <Stack horizontal tokens={stackTokens}>
                <StackItem disableShrink>
                    <Checkbox
                        label={getI18nValue(
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
                            {getI18nValue(
                                'Template_Export_IncludePreview_Image_Disclaimer_Para1',
                                [PREVIEW_IMAGE_CAP_SIZE, PREVIEW_IMAGE_CAP_SIZE]
                            )}
                            <br />
                            <br />
                            <strong>
                                {getI18nValue(
                                    'Template_Export_IncludePreview_Image_Disclaimer_Para2'
                                )}
                                <br />
                                <br />
                                {getI18nValue(
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
