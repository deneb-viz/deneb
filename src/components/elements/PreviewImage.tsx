import React from 'react';

import { Image, IImageProps, ImageFit } from '@fluentui/react/lib/Image';

import { viewServices } from '../../core/services';
import { blankImageBase64, isBase64 } from '../../core/ui/dom';

interface IPreviewImageProps extends IImageProps {
    isValid: boolean;
    dataUri: string;
}

const PreviewImage: React.FC<IPreviewImageProps> = (props) => {
    const src =
        (isBase64(props.dataUri) && `data:image/png;base64,${props.dataUri}`) ||
        blankImageBase64;
    return props.isValid ? (
        <Image
            height={viewServices.previewImageSize}
            width={viewServices.previewImageSize}
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
