import { Body1, makeStyles, tokens } from '@fluentui/react-components';

import { type RemapState } from '@deneb-viz/json-processing/field-tracking';
import { useDenebState } from '../../../state';
import {
    StageProgressIndicator,
    useModalDialogStyles
} from '../../../components/ui';
import { logRender } from '@deneb-viz/utils/logging';

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
export const FieldRemapPaneProgress = () => {
    const classes = useModalDialogStyles();
    const progressClasses = useProgressStyles();
    const { remapState, translate } = useDenebState((state) => ({
        remapState: state.interface.remapState,
        translate: state.i18n.translate
    }));
    logRender('FieldRemapPane');
    return (
        <div className={classes.paneContentScrollable}>
            <p>
                <Body1>{translate('Text_Remap_In_Progress_Message')}</Body1>
            </p>
            <div className={progressClasses.container}>
                <StageProgressIndicator
                    message={translate('Text_Remap_State_Tokenizing')}
                    isInProgress={remapState === 'Tokenizing'}
                    isCompleted={hasPassedStage(remapState, 'Tokenizing')}
                />
                <StageProgressIndicator
                    message={translate('Text_Remap_State_Replacing')}
                    isInProgress={remapState === 'Replacing'}
                    isCompleted={hasPassedStage(remapState, 'Replacing')}
                />
                <StageProgressIndicator
                    message={translate('Text_Remap_State_Tracking')}
                    isInProgress={remapState === 'Tracking'}
                    isCompleted={hasPassedStage(remapState, 'Tracking')}
                />
                <StageProgressIndicator
                    message={translate('Text_Remap_State_UpdatingEditor')}
                    isInProgress={remapState === 'UpdatingEditor'}
                    isCompleted={hasPassedStage(remapState, 'UpdatingEditor')}
                />
            </div>
        </div>
    );
};

// Ordered list of remap stages to support simple progression checks
const REMAP_STATE_ORDER: readonly RemapState[] = [
    'Tokenizing',
    'Replacing',
    'Tracking',
    'UpdatingEditor',
    'Complete'
] as const;

const hasPassedStage = (current: RemapState, stage: RemapState) => {
    return (
        REMAP_STATE_ORDER.indexOf(current) > REMAP_STATE_ORDER.indexOf(stage)
    );
};
