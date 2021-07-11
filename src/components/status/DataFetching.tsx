import * as React from 'react';
import { useSelector } from 'react-redux';

import { state } from '../../store';

import Progress from './Progress';
import { BodyHeading, Heading } from '../elements/Text';
import StatusHeaderSection from './StatusHeaderSection';
import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import { getHostLM } from '../../api/i18n';
import { getState } from '../../api/store';

const DataFetching = () => {
    const root = useSelector(state),
        { dataRowsLoaded } = root.visual,
        i18n = getHostLM();

    return (
        <>
            <StatusLayoutStack>
                <StatusHeaderSection icon='cog'>
                    <Heading>{i18n.getDisplayName('Fetching_Data')}</Heading>
                    <Progress
                        description={`${dataRowsLoaded} ${i18n.getDisplayName(
                            'Fetching_Data_Progress_Suffix'
                        )}`}
                    />
                </StatusHeaderSection>
                <StatusLayoutStackItem verticalFill>
                    {customVisualNotes()}
                </StatusLayoutStackItem>
            </StatusLayoutStack>
        </>
    );
};

const customVisualNotes = () => {
    const { dataLimit } = getState().visual.settings,
        i18n = getHostLM();
    return (
        (dataLimit.enabled &&
            dataLimit.override &&
            dataLimit.showCustomVisualNotes && (
                <>
                    <div>
                        <BodyHeading>
                            {i18n.getDisplayName(
                                'Fetching_Data_Developer_Notes'
                            )}
                        </BodyHeading>
                    </div>
                    <div className='ms-Grid-row ms-fontSize-12'>
                        <div className='ms-Grid-col ms-sm12'>
                            <p>
                                {i18n.getDisplayName(
                                    'Fetching_Data_Assitive_01_Prefix'
                                )}
                                <b>
                                    {i18n.getDisplayName(
                                        'Objects_DataLimit_Override'
                                    )}
                                </b>
                                {i18n.getDisplayName(
                                    'Fetching_Data_Assitive_01_Suffix'
                                )}
                            </p>
                            <p>
                                <ul>
                                    <li>
                                        {i18n.getDisplayName(
                                            'Fetching_Data_Assitive_02_Point_01'
                                        )}
                                    </li>
                                    <li>
                                        {i18n.getDisplayName(
                                            'Fetching_Data_Assitive_02_Point_02'
                                        )}
                                    </li>
                                </ul>
                            </p>
                            <p>
                                {i18n.getDisplayName(
                                    'Fetching_Data_Assitive_02_Suffix'
                                )}
                            </p>
                            <p>
                                {i18n.getDisplayName(
                                    'Fetching_Data_Assitive_03_Prefix'
                                )}
                                <b>
                                    {i18n.getDisplayName(
                                        'Objects_DataLimit_ShowCustomVisualNotes'
                                    )}
                                </b>
                                {i18n.getDisplayName(
                                    'Fetching_Data_Assitive_03_Suffix'
                                )}
                            </p>
                        </div>
                    </div>
                </>
            )) ||
        null
    );
};

export default DataFetching;
