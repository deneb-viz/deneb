import React from 'react';

import { Image, IImageProps, ImageFit } from '@fluentui/react/lib/Image';

import { viewServices } from '../../core/services';

interface IPreviewImageProps extends IImageProps {
    isValid: boolean;
    dataUri: string;
}

const PreviewImage: React.FC<IPreviewImageProps> = (props) => {
    return props.isValid ? (
        <Image
            height={viewServices.previewImageSize}
            width={viewServices.previewImageSize}
            imageFit={ImageFit.none}
            src={props.dataUri}
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
