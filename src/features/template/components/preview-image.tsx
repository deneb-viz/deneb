import React from 'react';
import { Image } from '@fluentui/react-components';

import { useTemplateStyles } from '.';
import { TEMPLATE_PREVIEW_IMAGE_MAX_SIZE } from '../../../../config';

interface IPreviewImageProps {
    isValid: boolean;
    dataUri: string;
}
/**
 * Handles display of a tmeplate preview image, from a base64 URI.
 */
export const PreviewImage: React.FC<IPreviewImageProps> = ({
    isValid,
    dataUri
}) => {
    const classes = useTemplateStyles();
    if (isValid) {
        return (
            <Image
                height={TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}
                width={TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}
                className={classes.previewImage}
                fit='none'
                src={dataUri}
            />
        );
    }
    return <></>;
};
