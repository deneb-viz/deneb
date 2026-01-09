import { type ChangeEvent, useCallback } from 'react';
import {
    Checkbox,
    type CheckboxOnChangeData,
    makeStyles,
    Subtitle2,
    tokens
} from '@fluentui/react-components';

import { logRender } from '@deneb-viz/utils/logging';
import {
    getBase64ImagePngBlank,
    getBase64MimeType
} from '@deneb-viz/utils/base64';
import { TEMPLATE_PREVIEW_IMAGE_MAX_SIZE } from '@deneb-viz/configuration';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';
import { useDenebState } from '../../../state';
import { CappedTextField, useModalDialogStyles } from '../../../components/ui';
import {
    PreviewImage,
    TEMPLATE_INFORMATION_PROPS
} from '../../../components/template-metadata';

const IMAGE_TYPE = 'png';

const useVisualExportInformationStyles = makeStyles({
    informationContainer: {
        display: 'flex',
        flexDirection: 'row',
        width: '100%',
        gap: `${tokens.spacingVerticalM} ${tokens.spacingVerticalNone}`
    },
    informationDetails: {
        flexGrow: 1,
        paddingRight: tokens.spacingHorizontalM,
        borderRightColor: tokens.colorNeutralStroke2,
        borderRightWidth: tokens.strokeWidthThin,
        borderRightStyle: 'solid'
    },
    informationPreviewCheckbox: {
        marginTop: tokens.spacingVerticalXL
    }
});

/**
 * Interface (pane) for exporting a existing visualization.
 */
export const ExportInformation = () => {
    const {
        includePreviewImage,
        previewImageBase64PNG,
        embedViewport,
        setPreviewImage,
        translate
    } = useDenebState((state) => ({
        includePreviewImage: state.export.includePreviewImage,
        previewImageBase64PNG:
            state.export?.metadata?.information.previewImageBase64PNG,
        embedViewport: state.interface.embedViewport,
        setPreviewImage: state.export.setPreviewImage,
        translate: state.i18n.translate
    }));
    const modalClasses = useModalDialogStyles();
    const exportClasses = useVisualExportInformationStyles();
    const onCheckboxChange = useCallback(
        (
            ev: ChangeEvent<HTMLInputElement>,
            data: CheckboxOnChangeData
        ): void => {
            const includePreviewImage = !!data.checked;
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let previewImageBase64PNG = getBase64ImagePngBlank();
            img.onload = () => {
                if (includePreviewImage && ctx) {
                    canvas.height = img.height;
                    canvas.width = img.width;
                    ctx.drawImage(img, 0, 0);
                    previewImageBase64PNG = canvas.toDataURL(
                        getBase64MimeType(IMAGE_TYPE)
                    );
                }
                setPreviewImage({
                    includePreviewImage,
                    previewImageBase64PNG
                });
            };
            const { width = 0, height = 0 } = embedViewport ?? {};
            const scale =
                width >= height
                    ? TEMPLATE_PREVIEW_IMAGE_MAX_SIZE / width
                    : TEMPLATE_PREVIEW_IMAGE_MAX_SIZE / height;
            VegaViewServices.getView()
                ?.toImageURL(IMAGE_TYPE, scale)
                .then((i) => (img.src = i));
        },
        []
    );
    logRender('VisualExportInformation');
    return (
        <div className={modalClasses.paneContentSection}>
            <div className={modalClasses.paneContentHeading}>
                <Subtitle2>
                    {translate('Template_Export_Information')}
                </Subtitle2>
            </div>
            <div className={exportClasses.informationContainer}>
                <div className={exportClasses.informationDetails}>
                    <div className={modalClasses.paneContentField}>
                        <CappedTextField
                            id='information.name'
                            i18nLabel='Template_Export_Information_Name'
                            i18nPlaceholder='Template_Export_Information_Name_Placeholder'
                            maxLength={
                                TEMPLATE_INFORMATION_PROPS.name.maxLength
                            }
                        />
                    </div>
                    <div className={modalClasses.paneContentField}>
                        <CappedTextField
                            id='information.description'
                            i18nLabel='Template_Export_Information_Description'
                            i18nPlaceholder='Template_Description_Optional_Placeholder'
                            maxLength={
                                TEMPLATE_INFORMATION_PROPS.description.maxLength
                            }
                            multiline
                        />
                    </div>
                    <div className={modalClasses.paneContentField}>
                        <CappedTextField
                            id='information.author'
                            i18nLabel='Template_Export_Author_Name'
                            i18nPlaceholder='Template_Export_Author_Name_Placeholder'
                            maxLength={
                                TEMPLATE_INFORMATION_PROPS.author.maxLength
                            }
                        />
                    </div>
                </div>
                <div>
                    <div className={exportClasses.informationPreviewCheckbox}>
                        <Checkbox
                            checked={includePreviewImage}
                            label={translate(
                                'Template_Export_Include_Preview_Image'
                            )}
                            onChange={onCheckboxChange}
                        />
                    </div>
                    <div>
                        {previewImageBase64PNG && (
                            <PreviewImage
                                isValid={true}
                                dataUri={previewImageBase64PNG}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
