import React from 'react';

import { Stack, IStackItemStyles } from '@fluentui/react/lib/Stack';
import { PrimaryButton } from '@fluentui/react/lib/Button';
import filter from 'lodash/filter';

import { useStoreProp } from '../../store';

import { i18nValue } from '../../core/ui/i18n';
import { Paragraph } from '../elements/Typography';
import Dataset, { getMapColumns } from '../elements/Dataset';
import { buttonStyles } from '../../core/ui/fluent';
import { remapSpecificationFields } from '../../core/utils/specification';
import { getDatasetTemplateFields } from '../../core/data/fields';
import { IVisualDatasetFields } from '../../core/data';
import { reactLog } from '../../core/utils/reactLog';
import {
    MODAL_DIALOG_STACK_INNER_TOKENS,
    MODAL_DIALOG_STACK_ITEM_STYLES,
    MODAL_DIALOG_STACK_STYLES
} from '../../features/modal-dialog';

const datasetItemStyles: IStackItemStyles = {
    root: {
        overflowY: 'auto'
    }
};

export const MapFieldsDialogBody = () => {
    const editorFieldsInUse: IVisualDatasetFields =
        useStoreProp('editorFieldsInUse');
    const dataset = getDatasetTemplateFields(editorFieldsInUse);
    const remapDisabled =
        filter(
            editorFieldsInUse,
            (f) => f.templateMetadata?.suppliedObjectName === undefined
        ).length > 0;
    const handleRemap = () => {
        remapSpecificationFields();
    };
    reactLog('Rendering [MapFieldsDialogBody]');
    return (
        <Stack
            styles={MODAL_DIALOG_STACK_STYLES}
            tokens={MODAL_DIALOG_STACK_INNER_TOKENS}
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
            <Stack.Item
                shrink
                styles={MODAL_DIALOG_STACK_ITEM_STYLES}
                align='end'
            >
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
