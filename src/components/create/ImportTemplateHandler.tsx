import * as React from 'react';
import { useSelector } from 'react-redux';

import { Text } from '@fluentui/react/lib/Text';

import Debugger from '../../Debugger';
import { state } from '../../store';
import ImportTemplateStatus from './ImportTemplateStatus';
import SpecDataPlaceHolderDropdown from './SpecDataPlaceHolderDropdown';
import { IDenebTemplateMetadata } from '../../schema/template-v1';
import { i18nValue } from '../../core/ui/i18n';

const ImportTemplateHandler: React.FC = () => {
    Debugger.log('Rendering Component: [ImportTemplateHandler]...');
    const root = useSelector(state),
        { templates } = root,
        { templateProvider, templateImportState, templateToApply } = templates,
        denebTemplate = templateToApply?.usermeta as IDenebTemplateMetadata,
        enumeratePlaceholders = () => {
            Debugger.log('Enumerating template placeholders...');
            switch (true) {
                case denebTemplate?.dataset?.length || 0 === 0: {
                    return (
                        <>
                            <p>
                                <Text variant='small'>
                                    {i18nValue(
                                        'Data_Placeholder_Assistive_No_PH'
                                    )}
                                </Text>
                            </p>
                        </>
                    );
                }
                default: {
                    return (
                        <>
                            <p>
                                <Text variant='small'>
                                    {i18nValue('Data_Placeholder_Assistive_PH')}
                                </Text>
                            </p>
                            {denebTemplate?.dataset?.map((ph) => (
                                <div>
                                    <SpecDataPlaceHolderDropdown
                                        datasetField={ph}
                                    />
                                </div>
                            ))}
                        </>
                    );
                }
            }
        };
    switch (true) {
        case templateProvider === 'import' && templateImportState !== 'Success':
            return <ImportTemplateStatus />;
        default:
            return (
                <div>
                    <p>
                        <Text
                            variant='large'
                            className='ms-fontWeight-semibold'
                        >
                            {denebTemplate?.information?.name}
                        </Text>
                    </p>
                    <p>
                        {denebTemplate?.information?.description ||
                            i18nValue('Template_No_Description')}
                    </p>
                    {enumeratePlaceholders()}
                </div>
            );
    }
};

export default ImportTemplateHandler;
