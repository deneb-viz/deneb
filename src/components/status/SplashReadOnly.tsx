import React, { useEffect } from 'react';

import StatusLayoutStack from './StatusLayoutStack';
import StatusLayoutStackItem from './StatusLayoutStackItem';
import StandardHeaderContent from './StandardHeaderContent';
import UsefulResources from './UsefulResources';
import { Paragraph } from '../elements/Typography';
import { i18nValue } from '../../core/ui/i18n';
import { hostServices } from '../../core/services';

const SplashReadOnly = () => {
    useEffect(() => hostServices.renderingFinished());
    return (
        <>
            <StatusLayoutStack>
                <StandardHeaderContent />
                <StatusLayoutStackItem verticalFill>
                    <div>
                        <Paragraph>
                            {i18nValue('Landing_Read_Only_01')}
                        </Paragraph>
                        <Paragraph>
                            {i18nValue('Landing_Read_Only_02')}
                        </Paragraph>
                    </div>
                    <UsefulResources />
                </StatusLayoutStackItem>
            </StatusLayoutStack>
        </>
    );
};

export default SplashReadOnly;
