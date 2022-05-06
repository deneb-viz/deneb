import React from 'react';

import { Image, IImageProps, ImageFit } from '@fluentui/react/lib/Image';

import { PREVIEW_IMAGE_CAP_SIZE } from '..';

interface IPreviewImageProps extends IImageProps {
    isValid: boolean;
    dataUri: string;
}

const PreviewImage: React.FC<IPreviewImageProps> = (props) => {
    const src = props.dataUri;
    return props.isValid ? (
        <Image
            height={PREVIEW_IMAGE_CAP_SIZE}
            width={PREVIEW_IMAGE_CAP_SIZE}
            imageFit={ImageFit.none}
            src={src}
            styles={{
                root: {
                    marginRight: 20
                }
            }}
            {...props}
        />
    ) : (
        <></>
    );
};

export default PreviewImage;
