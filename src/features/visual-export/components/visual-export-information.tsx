import React, { useCallback } from 'react';
import { Checkbox, CheckboxProps, Subtitle2 } from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import store from '../../../store';
import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';
import { useVisualExportStyles } from '.';
import {
    TEMPLATE_INFORMATION_PROPS,
    dispatchPreviewImage
} from '../../template';
import {
    CappedTextField,
    PreviewImage,
    useModalDialogStyles
} from '@deneb-viz/app-core';

/**
 * Interface (pane) for exporting a existing visualization.
 */
export const VisualExportInformation: React.FC = () => {
    const { includePreviewImage, previewImageBase64PNG } = store(
        (state) => ({
            includePreviewImage: state.export.includePreviewImage,
            previewImageBase64PNG:
                state.export.metadata.information.previewImageBase64PNG
        }),
        shallow
    );
    const modalClasses = useModalDialogStyles();
    const exportClasses = useVisualExportStyles();
    const onCheckboxChange: CheckboxProps['onChange'] = useCallback(
        (ev, data): void => {
            dispatchPreviewImage(!!data.checked);
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
