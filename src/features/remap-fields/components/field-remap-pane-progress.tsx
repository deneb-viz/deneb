import { Body1, makeStyles, tokens } from '@fluentui/react-components';
import React from 'react';
import { shallow } from 'zustand/shallow';

import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';
import { useModalDialogStyles } from '../../modal-dialog';
import store from '../../../store';
import { RemapState } from '@deneb-viz/json-processing/field-tracking';
import { StageProgressIndicator } from '../../modal-dialog';

const useProgressStyles = makeStyles({
    container: {
        display: 'flex',
        flexDirection: 'column',
        rowGap: tokens.spacingVerticalM
    }
});

/**
 * Interface (pane) for remapping visual fields.
 */
export const FieldRemapPaneProgress: React.FC = () => {
    const classes = useModalDialogStyles();
    const progressClasses = useProgressStyles();
    const { remapState } = store(
        (state) => ({
            remapState: state.interface.remapState
        }),
        shallow
    );
    logRender('FieldRemapPane');
    return (
        <div className={classes.paneContentScrollable}>
            <p>
                <Body1>{getI18nValue('Text_Remap_In_Progress_Message')}</Body1>
            </p>
            <div className={progressClasses.container}>
                <StageProgressIndicator
                    message={getI18nValue('Text_Remap_State_Tokenizing')}
                    isInProgress={remapState === RemapState.Tokenizing}
                    isCompleted={remapState > RemapState.Tokenizing}
                />
                <StageProgressIndicator
                    message={getI18nValue('Text_Remap_State_Replacing')}
                    isInProgress={remapState === RemapState.Replacing}
                    isCompleted={remapState > RemapState.Replacing}
                />
                <StageProgressIndicator
                    message={getI18nValue('Text_Remap_State_Tracking')}
                    isInProgress={remapState === RemapState.Tracking}
                    isCompleted={remapState > RemapState.Tracking}
                />
                <StageProgressIndicator
                    message={getI18nValue('Text_Remap_State_UpdatingEditor')}
                    isInProgress={remapState === RemapState.UpdatingEditor}
                    isCompleted={remapState > RemapState.UpdatingEditor}
                />
            </div>
        </div>
    );
};
