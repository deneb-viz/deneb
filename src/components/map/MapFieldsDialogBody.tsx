import * as React from 'react';

import { Stack, IStackItemStyles } from '@fluentui/react/lib/Stack';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import filter from 'lodash/filter';
import { Scrollbars } from 'react-custom-scrollbars-2';

import {
    modalDialogStackStyles,
    modalDialogStackItemStyles,
    modalDialogInnerStackTokens
} from '../../core/ui/modal';
import store from '../../store';

import { i18nValue } from '../../core/ui/i18n';
import { Paragraph } from '../elements/Typography';
import Dataset, { getMapColumns } from '../elements/Dataset';
import { getTemplateFieldsFromMetadata } from '../../core/data/dataset';
import { buttonStyles } from '../../core/ui/fluent';
import { remapSpecificationFields } from '../../core/utils/specification';

const datasetItemStyles: IStackItemStyles = {
    root: {
        overflowY: 'auto'
    }
};

export const MapFieldsDialogBody = () => {
    const { editorFieldsInUse } = store((state) => state);
    const dataset = getTemplateFieldsFromMetadata(editorFieldsInUse);
    const remapDisabled =
        filter(
            editorFieldsInUse,
            (f) => f.templateMetadata?.suppliedObjectName === undefined
        ).length > 0;
    const handleRemap = () => {
        remapSpecificationFields();
    };
    return (
        <Stack
            styles={modalDialogStackStyles}
            tokens={modalDialogInnerStackTokens}
        >
            <Stack.Item shrink>
                <Paragraph>
                    {i18nValue('Map_Fields_Assistive_Introduction')}
                </Paragraph>
                <Paragraph>
                    {i18nValue('Map_Fields_Assistive_Instructions')}
                </Paragraph>
                <Paragraph>
                    {i18nValue('Map_Fields_Completion_Instructions')}
                </Paragraph>
            </Stack.Item>
            <Stack.Item verticalFill styles={datasetItemStyles}>
                <>
                    <Dataset dataset={dataset} columns={getMapColumns} />
                </>
            </Stack.Item>
            <Stack.Item shrink styles={modalDialogStackItemStyles} align='end'>
                <PrimaryButton
                    styles={buttonStyles}
                    onClick={handleRemap}
                    text={i18nValue('Button_Remap')}
                    disabled={remapDisabled}
                />
            </Stack.Item>
        </Stack>
    );
};

export default MapFieldsDialogBody;
