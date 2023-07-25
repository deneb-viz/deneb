import React from 'react';
import { Image } from '@fluentui/react-components';

import { PREVIEW_IMAGE_CAP_SIZE } from '../preview-image';
import { useTemplateStyles } from '.';

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
                height={PREVIEW_IMAGE_CAP_SIZE}
                width={PREVIEW_IMAGE_CAP_SIZE}
                className={classes.previewImage}
                fit='none'
                src={dataUri}
            />
        );
    }
    return <></>;
};
