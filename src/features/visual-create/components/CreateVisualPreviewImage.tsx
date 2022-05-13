import React from 'react';

import { mergeStyles } from '@fluentui/react/lib/Styling';
import { StackItem } from '@fluentui/react/lib/Stack';
import { Separator } from '@fluentui/react/lib/Separator';

import store from '../../../store';
import { getConfig } from '../../../core/utils/config';
import { IDenebTemplateMetadata } from '../../template';
import { isBase64Image } from '../../template/preview-image';
import { PreviewImage } from '../../template';

const verticalSeparatorStyles = mergeStyles({
    height: getConfig().templates.previewImageSize
});

export const CreateVisualPreviewImage: React.FC = () => {
    const usermeta = store((state) => state).templateToApply
        .usermeta as IDenebTemplateMetadata;
    const previewImage = usermeta?.information?.previewImageBase64PNG;
    const hasPreviewImage =
        (previewImage && isBase64Image(previewImage)) || false;
    return hasPreviewImage ? (
        <>
            <StackItem shrink>
                <Separator vertical className={verticalSeparatorStyles} />
            </StackItem>
            <StackItem shrink>
                <PreviewImage isValid={true} dataUri={previewImage} />
            </StackItem>
        </>
    ) : (
        <></>
    );
};
