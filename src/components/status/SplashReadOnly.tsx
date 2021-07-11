import * as React from 'react';

import { getHostLM } from '../../api/i18n';

import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import StandardHeaderContent from './StandardHeaderContent';
import UsefulResources from './UsefulResources';
import { Paragraph } from '../elements/Text';

const SplashReadOnly = () => {
    const i18n = getHostLM();
    return (
        <>
            <StatusLayoutStack>
                <StandardHeaderContent />
                <StatusLayoutStackItem verticalFill>
                    <div>
                        <Paragraph>
                            {i18n.getDisplayName('Landing_Read_Only_01')}
                        </Paragraph>
                        <Paragraph>
                            {i18n.getDisplayName('Landing_Read_Only_02')}
                        </Paragraph>
                    </div>
                    <UsefulResources />
                </StatusLayoutStackItem>
            </StatusLayoutStack>
        </>
    );
};

export default SplashReadOnly;
