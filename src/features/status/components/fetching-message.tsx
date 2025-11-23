import React from 'react';
import { shallow } from 'zustand/shallow';
import { Caption1, Title3 } from '@fluentui/react-components';

import { StatusContainer } from './status-container';
import store, { getState } from '../../../store';
import { StatusStackItem } from './status-stack-item';
import { useStatusStyles } from '.';
import { Progress } from './progress';
import { getFormattedValue } from '@deneb-viz/powerbi-compat/formatting';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { logRender } from '@deneb-viz/utils/logging';

/**
 * Displays when the visual is fetching data from the data model, and provides
 * status details of how this is going, so that the reader understands that
 * something is happening.
 */
export const FetchingMessage: React.FC = () => {
    const { rowsLoaded } = store(
        (state) => ({
            rowsLoaded: state.dataset.rowsLoaded
        }),
        shallow
    );
    logRender('FetchingMessage');
    return (
        <StatusContainer>
            <StatusStackItem>
                <Progress
                    description={`${getI18nValue(
                        'Fetching_Data'
                    )}. ${getFormattedValue(rowsLoaded, '#,0')} ${getI18nValue(
                        'Fetching_Data_Progress_Suffix'
                    )}`}
                />
            </StatusStackItem>
            <StatusStackItem>{customVisualNotes()}</StatusStackItem>
        </StatusContainer>
    );
};

/**
 * Handle the display for the 'notes for creators', if they're specified.
 */
const customVisualNotes = () => {
    const { dataLimit } = getState().visualSettings;
    const classes = useStatusStyles();
    return (
        (dataLimit.loading.override.value &&
            dataLimit.loading.showCustomVisualNotes.value && (
                <>
                    <StatusStackItem>
                        <Title3>
                            {getI18nValue('Fetching_Data_Developer_Notes')}
                        </Title3>
                    </StatusStackItem>
                    <StatusStackItem>
                        <Caption1>
                            {getI18nValue('Fetching_Data_Assitive_01_Prefix')}
                            <b>{getI18nValue('Objects_DataLimit_Override')}</b>
                            {getI18nValue('Fetching_Data_Assitive_01_Suffix')}
                        </Caption1>
                        <Caption1>
                            <p>
                                <ul>
                                    <li className={classes.li}>
                                        {getI18nValue(
                                            'Fetching_Data_Assitive_02_Point_01'
                                        )}
                                    </li>
                                    <li className={classes.li}>
                                        {getI18nValue(
                                            'Fetching_Data_Assitive_02_Point_02'
                                        )}
                                    </li>
                                </ul>
                            </p>
                            <p>
                                {getI18nValue(
                                    'Fetching_Data_Assitive_02_Suffix'
                                )}
                            </p>
                            <p>
                                {getI18nValue(
                                    'Fetching_Data_Assitive_03_Prefix'
                                )}
                                <b>
                                    {getI18nValue(
                                        'Objects_DataLimit_ShowCustomVisualNotes'
                                    )}
                                </b>
                                {getI18nValue(
                                    'Fetching_Data_Assitive_03_Suffix'
                                )}
                            </p>
                        </Caption1>
                    </StatusStackItem>
                </>
            )) ||
        null
    );
};
