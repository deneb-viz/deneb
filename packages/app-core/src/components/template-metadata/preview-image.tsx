import { Image, makeStyles, tokens } from '@fluentui/react-components';

import { TEMPLATE_PREVIEW_IMAGE_MAX_SIZE } from '@deneb-viz/configuration';

type PreviewImageProps = {
    isValid: boolean;
    dataUri: string;
};

export const usePreviewImageStyles = makeStyles({
    root: {
        minWidth: `${TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}px`,
        minHeight: `${TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}px`,
        width: `${TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}px`,
        height: `${TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}px`,
        margin: tokens.spacingVerticalXS
    }
});

/**
 * Handles display of a template preview image, from a base64 URI.
 */
export const PreviewImage = ({ isValid, dataUri }: PreviewImageProps) => {
    const classes = usePreviewImageStyles();
    if (isValid) {
        return (
            <Image
                height={TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}
                width={TEMPLATE_PREVIEW_IMAGE_MAX_SIZE}
                className={classes.root}
                fit='none'
                src={dataUri}
            />
        );
    }
    return <></>;
};
