import { useState } from 'react';
import {
    Field,
    ProgressBar,
    Tooltip,
    makeStyles
} from '@fluentui/react-components';

import { useDenebState } from '../../../state';
import { TooltipCustomMount } from '../../../components/ui';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { logRender } from '@deneb-viz/utils/logging';

const useTokenizerStyles = makeStyles({
    root: {
        alignItems: 'center',
        display: 'flex',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    field: {
        whiteSpace: 'nowrap',
        width: '100%'
    }
});

export const TrackingSyncStatus = () => {
    const [ref, setRef] = useState<HTMLElement | null>();
    const isTrackingFields = useDenebState(
        (state) => state.interface.isTrackingFields
    );
    const classes = useTokenizerStyles();
    logRender('TrackingSyncStatus');
    return (
        isTrackingFields && (
            <div className={classes.root}>
                <TooltipCustomMount setRef={setRef} />
                <Tooltip
                    content={getI18nValue('Text_Tokenizer_Sync_Tooltip')}
                    relationship='label'
                    withArrow
                    mountNode={ref}
                    positioning='below-start'
                >
                    <Field
                        className={classes.field}
                        validationMessage={getI18nValue(
                            'Text_Tokenizer_Sync_Message'
                        )}
                        validationState='none'
                    >
                        <ProgressBar />
                    </Field>
                </Tooltip>
            </div>
        )
    );
};
