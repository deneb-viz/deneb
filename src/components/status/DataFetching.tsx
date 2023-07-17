import * as React from 'react';

import store from '../../store';

import Progress from './Progress';
import { BodyHeading, Heading } from '../elements/Typography';
import StatusHeaderSection from './StatusHeaderSection';
import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import { powerBiFormatValue } from '../../utils';
import { getI18nValue } from '../../features/i18n';

const DataFetching = () => {
    const { rowsLoaded } = store((state) => ({
        rowsLoaded: state.dataset.rowsLoaded
    }));
    return (
        <>
            <StatusLayoutStack>
                <StatusHeaderSection icon='cog'>
                    <Heading>{getI18nValue('Fetching_Data')}</Heading>
                    <Progress
                        description={`${powerBiFormatValue(
                            rowsLoaded,
                            '#,##0'
                        )} ${getI18nValue('Fetching_Data_Progress_Suffix')}`}
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
                            {getI18nValue('Fetching_Data_Developer_Notes')}
                        </BodyHeading>
                    </div>
                    <div className='ms-Grid-row ms-fontSize-12'>
                        <div className='ms-Grid-col ms-sm12'>
                            <p>
                                {getI18nValue(
                                    'Fetching_Data_Assitive_01_Prefix'
                                )}
                                <b>
                                    {getI18nValue('Objects_DataLimit_Override')}
                                </b>
                                {getI18nValue(
                                    'Fetching_Data_Assitive_01_Suffix'
                                )}
                            </p>
                            <p>
                                <ul>
                                    <li>
                                        {getI18nValue(
                                            'Fetching_Data_Assitive_02_Point_01'
                                        )}
                                    </li>
                                    <li>
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
                        </div>
                    </div>
                </>
            )) ||
        null
    );
};

export default DataFetching;
