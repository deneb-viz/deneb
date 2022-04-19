import * as React from 'react';
import { Stack, StackItem, IStackTokens } from '@fluentui/react/lib/Stack';
import { Separator } from '@fluentui/react/lib/Separator';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { Scrollbars } from 'react-custom-scrollbars-2';

import store from '../../../store';
import { IDenebTemplateMetadata } from '../../../core/template/schema';
import { i18nValue } from '../../../core/ui/i18n';
import TemplateDatasetPlaceholders from './TemplateDatasetPlaceholders';
import { BodyHeading, SubHeading } from '../../elements/Typography';
import Dataset, { getImportColumns } from '../../elements/Dataset';
import PreviewImage from '../../elements/PreviewImage';
import { getConfig } from '../../../core/utils/config';
import { isBase64 } from '../../../core/ui/dom';
import { DATASET_NAME } from '../../../core/constants';

const stackTokens: IStackTokens = {
    childrenGap: 25
};

const verticalSeparatorStyles = mergeStyles({
    height: getConfig().templates.previewImageSize
});

const TemplateInfo: React.FC = () => {
    const usermeta = store((state) => state).templateToApply
        .usermeta as IDenebTemplateMetadata;
    const previewImage = usermeta?.information?.previewImageBase64PNG;
    const hasPreviewImage = (previewImage && isBase64(previewImage)) || false;
    const hasPlaceholders = usermeta?.[DATASET_NAME]?.length > 0;
    return (
        <>
            <Stack horizontal tokens={stackTokens}>
                <StackItem grow>
                    <BodyHeading>{usermeta?.information?.name}</BodyHeading>
                    <SubHeading>
                        {usermeta?.information?.description ||
                            i18nValue('Template_No_Description')}
                    </SubHeading>
                    <TemplateDatasetPlaceholders />
                </StackItem>
                {hasPreviewImage ? (
                    <>
                        <StackItem shrink>
                            <Separator
                                vertical
                                className={verticalSeparatorStyles}
                            />
                        </StackItem>
                        <StackItem shrink>
                            <PreviewImage
                                isValid={true}
                                dataUri={previewImage}
                            />
                        </StackItem>
                    </>
                ) : (
                    <></>
                )}
            </Stack>
            {hasPlaceholders ? (
                <Dataset
                    dataset={usermeta?.[DATASET_NAME]}
                    columns={getImportColumns}
                />
            ) : (
                <></>
            )}
        </>
    );
};

export default TemplateInfo;
