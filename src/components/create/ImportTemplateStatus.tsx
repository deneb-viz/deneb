import * as React from 'react';
import { useSelector } from 'react-redux';

import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { Progress } from '../status/Progress';

const ImportTemplateStatus: React.FC = () => {
    Debugger.log('Rendering Component: [ImportTemplateStatus]...');
    const root = useSelector(state),
        { visual, templates } = root,
        { i18n } = visual,
        { templateImportState, templateImportErrorMessage } = templates,
        standardMessage = (message: string) => (
            <MessageBar messageBarType={MessageBarType.info}>
                {message}
            </MessageBar>
        ),
        resolveProcessingContent = () => {
            switch (templateImportState) {
                case 'Error': {
                    return (
                        <MessageBar messageBarType={MessageBarType.error}>
                            {templateImportErrorMessage}
                        </MessageBar>
                    );
                }
                case 'Supplied':
                case 'Loading':
                case 'Validating': {
                    return (
                        <Progress
                            description={i18n.getDisplayName(
                                `Template_Import_${templateImportState}`
                            )}
                        />
                    );
                }
                default: {
                    return standardMessage(
                        i18n.getDisplayName(
                            `Template_Import_${templateImportState}`
                        )
                    );
                }
            }
        };
    return <>{resolveProcessingContent()}</>;
};

export default ImportTemplateStatus;
