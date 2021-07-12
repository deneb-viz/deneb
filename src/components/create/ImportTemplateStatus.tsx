import * as React from 'react';
import { useSelector } from 'react-redux';

import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

import { state } from '../../store';
import { Progress } from '../status/Progress';
import { getHostLM } from '../../api/i18n';

const ImportTemplateStatus: React.FC = () => {
    const root = useSelector(state),
        { visual, templates } = root,
        { templateImportState, templateImportErrorMessage } = templates,
        i18n = getHostLM(),
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
