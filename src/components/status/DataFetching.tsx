import * as React from 'react';

import store from '../../store';

import Progress from './Progress';
import { BodyHeading, Heading } from '../elements/Typography';
import StatusHeaderSection from './StatusHeaderSection';
import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import { i18nValue } from '../../core/ui/i18n';

const DataFetching = () => {
    const { datasetRowsLoaded } = store((state) => state);
    return (
        <>
            <StatusLayoutStack>
                <StatusHeaderSection icon='cog'>
                    <Heading>{i18nValue('Fetching_Data')}</Heading>
                    <Progress
                        description={`${datasetRowsLoaded} ${i18nValue(
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
    const { dataLimit } = store((state) => state.visualSettings);
    return (
        (dataLimit.enabled &&
            dataLimit.override &&
            dataLimit.showCustomVisualNotes && (
                <>
                    <div>
                        <BodyHeading>
                            {i18nValue('Fetching_Data_Developer_Notes')}
                        </BodyHeading>
                    </div>
                    <div className='ms-Grid-row ms-fontSize-12'>
                        <div className='ms-Grid-col ms-sm12'>
                            <p>
                                {i18nValue('Fetching_Data_Assitive_01_Prefix')}
                                <b>{i18nValue('Objects_DataLimit_Override')}</b>
                                {i18nValue('Fetching_Data_Assitive_01_Suffix')}
                            </p>
                            <p>
                                <ul>
                                    <li>
                                        {i18nValue(
                                            'Fetching_Data_Assitive_02_Point_01'
                                        )}
                                    </li>
                                    <li>
                                        {i18nValue(
                                            'Fetching_Data_Assitive_02_Point_02'
                                        )}
                                    </li>
                                </ul>
                            </p>
                            <p>
                                {i18nValue('Fetching_Data_Assitive_02_Suffix')}
                            </p>
                            <p>
                                {i18nValue('Fetching_Data_Assitive_03_Prefix')}
                                <b>
                                    {i18nValue(
                                        'Objects_DataLimit_ShowCustomVisualNotes'
                                    )}
                                </b>
                                {i18nValue('Fetching_Data_Assitive_03_Suffix')}
                            </p>
                        </div>
                    </div>
                </>
            )) ||
        null
    );
};

export default DataFetching;
