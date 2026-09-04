import { Caption1, Title3 } from '@fluentui/react-components';

import { StatusContainer } from './status-container';
import { StatusStackItem } from './status-stack-item';
import { useStatusStyles } from '.';
import { Progress } from './progress';
import { getFormattedValue } from '@deneb-viz/powerbi-compat/formatting';
import { logRender } from '@deneb-viz/utils/logging';
import { useDenebState } from '@deneb-viz/app-core';
import { useDenebVisualState } from '../../../state';

/**
 * Displays when the visual is fetching data from the data model, and provides
 * status details of how this is going, so that the reader understands that
 * something is happening.
 */
export const FetchingMessage = () => {
    const translate = useDenebState((state) => state.i18n.translate);
    const rowsLoaded = useDenebVisualState((state) => state.dataset.rowsLoaded);
    logRender('FetchingMessage');
    return (
        <StatusContainer>
            <StatusStackItem>
                <Progress
                    description={`${translate(
                        'PowerBI_Fetching_Data_Progress_Message'
                    )}. ${getFormattedValue(rowsLoaded, '#,0')} ${translate(
                        'PowerBI_Fetching_Data_Progress_Suffix'
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
    const { override, showCustomVisualNotes } = useDenebVisualState(
        (state) => ({
            override: state.settings.dataLimit.loading.override
                .value as boolean,
            showCustomVisualNotes: state.settings.dataLimit.loading
                .showCustomVisualNotes.value as boolean
        })
    );
    const translate = useDenebState((state) => state.i18n.translate);
    const classes = useStatusStyles();
    return (
        (override && showCustomVisualNotes && (
            <>
                <StatusStackItem>
                    <Title3>
                        {translate('PowerBI_Fetching_Data_Developer_Notes')}
                    </Title3>
                </StatusStackItem>
                <StatusStackItem>
                    <Caption1>
                        {translate('PowerBI_Fetching_Data_Assistive_01_Prefix')}
                        <b>{translate('PowerBI_Objects_DataLimit_Override')}</b>
                        {translate('PowerBI_Fetching_Data_Assistive_01_Suffix')}
                    </Caption1>
                    <Caption1>
                        <p>
                            <ul>
                                <li className={classes.li}>
                                    {translate(
                                        'PowerBI_Fetching_Data_Assistive_02_Point_01'
                                    )}
                                </li>
                                <li className={classes.li}>
                                    {translate(
                                        'PowerBI_Fetching_Data_Assistive_02_Point_02'
                                    )}
                                </li>
                            </ul>
                        </p>
                        <p>
                            {translate(
                                'PowerBI_Fetching_Data_Assistive_02_Suffix'
                            )}
                        </p>
                        <p>
                            {translate(
                                'PowerBI_Fetching_Data_Assistive_03_Prefix'
                            )}
                            <b>
                                {translate(
                                    'PowerBI_Objects_DataLimit_ShowCustomVisualNotes'
                                )}
                            </b>
                            {translate(
                                'PowerBI_Fetching_Data_Assistive_03_Suffix'
                            )}
                        </p>
                    </Caption1>
                </StatusStackItem>
            </>
        )) ||
        null
    );
};
