import * as React from 'react';
import { Text } from '@fluentui/react/lib/Text';

import store from '../../../store';
import { IDenebTemplateMetadata } from '../../../core/template/schema';
import { i18nValue } from '../../../core/ui/i18n';
import TemplateDatasetPlaceholders from './TemplateDatasetPlaceholders';
import { BodyHeading, SubHeading } from '../../elements/Typography';

const TemplateInfo: React.FC = () => {
    const usermeta = store((state) => state).templateToApply
        .usermeta as IDenebTemplateMetadata;
    return (
        <div>
            <BodyHeading>{usermeta?.information?.name}</BodyHeading>
            <SubHeading>
                {usermeta?.information?.description ||
                    i18nValue('Template_No_Description')}
            </SubHeading>
            <TemplateDatasetPlaceholders />
        </div>
    );
};

export default TemplateInfo;
