import powerbi from 'powerbi-visuals-api';
import ILocalizationManager = powerbi.extensibility.ILocalizationManager;

import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Separator } from '@fluentui/react/lib/Separator';
import { Text } from '@fluentui/react/lib/Text';

import Debugger from '../../Debugger';
import {
    landingVisualNameStyles,
    landingVerticalStackItemStyles,
    landingHorizontalSeparatorStyles,
    landingVerticalInnerStackTokens,
    landingVerticalOuterStackTokens,
    landingVerticalStackOuterStyles,
    landingVerticalStackStyles,
    landingSectionHeadingStyles
} from '../../config/styles';
import { IDataFetchingProps } from '../../types';
import DataLimitSettings from '../../properties/DataLimitSettings';
import Progress from './Progress';

const DataFetching = (props: IDataFetchingProps) => {
    const { i18n, dataRowsLoaded, dataLimit } = props;
    Debugger.log('Rendering Component: [DataFetching]...');

    return (
        <>
            <Stack
                styles={landingVerticalStackOuterStyles}
                tokens={landingVerticalOuterStackTokens}
            >
                <Stack
                    styles={landingVerticalStackStyles}
                    tokens={landingVerticalInnerStackTokens}
                >
                    <Stack.Item shrink styles={landingVerticalStackItemStyles}>
                        <Stack horizontal>
                            <Stack.Item grow>
                                <div>
                                    <Text styles={landingVisualNameStyles}>
                                        {i18n.getDisplayName('Fetching_Data')}
                                    </Text>
                                </div>
                                <Progress
                                    description={`${dataRowsLoaded} ${i18n.getDisplayName(
                                        'Fetching_Data_Progress_Suffix'
                                    )}`}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <div className='visual-header-image cog' />
                            </Stack.Item>
                        </Stack>
                    </Stack.Item>
                    <Stack.Item shrink styles={landingVerticalStackItemStyles}>
                        <Separator styles={landingHorizontalSeparatorStyles} />
                    </Stack.Item>
                    <Stack.Item
                        verticalFill
                        styles={landingVerticalStackItemStyles}
                    >
                        {customVisualNotes(dataLimit, i18n)}
                    </Stack.Item>
                </Stack>
            </Stack>
        </>
    );
};

const customVisualNotes = (
    dataLimit: DataLimitSettings,
    i18n: ILocalizationManager
) => {
    return (
        (dataLimit.enabled &&
            dataLimit.override &&
            dataLimit.showCustomVisualNotes && (
                <>
                    <div>
                        <Text styles={landingSectionHeadingStyles}>
                            {i18n.getDisplayName(
                                'Fetching_Data_Developer_Notes'
                            )}
                        </Text>
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
