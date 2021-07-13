import * as React from 'react';

import { getVisualMetadata } from '../../api/config';
import { getVersionInfo } from '../../api/ui';

import { Heading, SubHeading, SubHeadingSecondary } from '../elements/Text';
import StatusHeaderSection from './StatusHeaderSection';

const StandardHeaderContent = () => {
    const visualMetadata = getVisualMetadata();
    return (
        <>
            <StatusHeaderSection icon='logo'>
                <Heading>{visualMetadata.displayName}</Heading>
                <SubHeading>{visualMetadata.description}</SubHeading>
                <SubHeadingSecondary>{getVersionInfo()}</SubHeadingSecondary>
            </StatusHeaderSection>
        </>
    );
};

export default StandardHeaderContent;