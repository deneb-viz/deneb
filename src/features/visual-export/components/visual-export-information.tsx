import React, { useCallback } from 'react';
import { Checkbox, CheckboxProps, Subtitle2 } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { useVisualExportStyles } from '.';
import {
    CappedTextField,
    PreviewImage,
    TEMPLATE_INFORMATION_PROPS,
    useModalDialogStyles
} from '@deneb-viz/app-core';
import { logRender } from '@deneb-viz/utils/logging';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import {
    getBase64ImagePngBlank,
    getBase64MimeType
} from '@deneb-viz/utils/base64';
import { TEMPLATE_PREVIEW_IMAGE_MAX_SIZE } from '@deneb-viz/configuration';
import { VegaViewServices } from '@deneb-viz/vega-runtime/view';

const IMAGE_TYPE = 'png';

/**
 * Interface (pane) for exporting a existing visualization.
 */
export const VisualExportInformation: React.FC = () => {
    const {
        includePreviewImage,
        previewImageBase64PNG,
        visualViewportReport,
        setPreviewImage
    } = store(
        (state) => ({
            includePreviewImage: state.export.includePreviewImage,
            previewImageBase64PNG:
                state.export.metadata.information.previewImageBase64PNG,
            visualViewportReport: state.visualViewportReport,
            setPreviewImage: state.export.setPreviewImage
        }),
        shallow
    );
    const modalClasses = useModalDialogStyles();
    const exportClasses = useVisualExportStyles();
    const onCheckboxChange: CheckboxProps['onChange'] = useCallback(
        (ev, data): void => {
            const includePreviewImage = !!data.checked;
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let previewImageBase64PNG = getBase64ImagePngBlank();
            img.onload = () => {
                if (includePreviewImage) {
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
            const { width, height } = visualViewportReport;
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
                    {getI18nValue('Template_Export_Information')}
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
                            label={getI18nValue(
                                'Template_Export_Include_Preview_Image'
                            )}
                            onChange={onCheckboxChange}
                        />
                    </div>
                    <div>
                        <PreviewImage
                            isValid={true}
                            dataUri={previewImageBase64PNG}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
