import { Body1, Caption1 } from '@fluentui/react-components';
import React from 'react';
import { shallow } from 'zustand/shallow';

import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';
import { useModalDialogStyles } from '../../modal-dialog';
import { TemplateDataset } from '../../template';
import store from '../../../store';
import { FieldRemapPaneProgress } from './field-remap-pane-progress';
import { RemapState } from '@deneb-viz/core-dependencies';

/**
 * Interface (pane) for remapping visual fields.
 */
export const FieldRemapPane: React.FC = () => {
    const classes = useModalDialogStyles();
    const { remapState } = store(
        (state) => ({
            remapState: state.interface.remapState
        }),
        shallow
    );
    logRender('FieldRemapPane');
    return (
        <div className={classes.paneRoot}>
            <div className={classes.paneMenu}>
                <p>
                    <Body1>{getI18nValue('Text_Dialog_Overview_Remap')}</Body1>
                </p>
                <p>
                    <Body1>
                        {getI18nValue('Text_Dialog_Instruction_Remap', [
                            getI18nValue('Text_Button_Remap')
                        ])}
                    </Body1>
                </p>
                <p>
                    <Caption1 italic>
                        {getI18nValue('Text_Dialog_Notes_Remap', [
                            getI18nValue('Text_Button_Close')
                        ])}
                    </Caption1>
                </p>
            </div>
            <div className={classes.paneContent}>
                {remapState !== RemapState.None ? (
                    <FieldRemapPaneProgress />
                ) : (
                    <div className={classes.paneContentScrollable}>
                        <TemplateDataset datasetRole='mapping' />
                    </div>
                )}
            </div>
        </div>
    );
};
