import React, { useState } from 'react';
import {
    Field,
    ProgressBar,
    Tooltip,
    makeStyles
} from '@fluentui/react-components';
import { shallow } from 'zustand/shallow';

import { logRender } from '../../logging';
import { getI18nValue } from '../../i18n';
import store from '../../../store';
import { TooltipCustomMount } from '@deneb-viz/app-core';

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

export const TrackingSyncStatus: React.FC = () => {
    const [ref, setRef] = useState<HTMLElement | null>();
    const { isTrackingFields } = store(
        (state) => ({
            isTrackingFields: state.interface.isTrackingFields
        }),
        shallow
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
