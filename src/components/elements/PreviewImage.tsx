import React from 'react';

import { Image, IImageProps, ImageFit } from '@fluentui/react/lib/Image';

import { previewImageCapSize } from '../../features/template';

interface IPreviewImageProps extends IImageProps {
    isValid: boolean;
    dataUri: string;
}

const PreviewImage: React.FC<IPreviewImageProps> = (props) => {
    const src = props.dataUri;
    return props.isValid ? (
        <Image
            height={previewImageCapSize}
            width={previewImageCapSize}
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
