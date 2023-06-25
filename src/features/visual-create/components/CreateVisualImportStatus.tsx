import React from 'react';

import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

import store from '../../../store';
import { Progress } from '../../../components/status/Progress';
import { getI18nValue } from '../../i18n';

export const CreateVisualImportStatus: React.FC = () => {
    const { templateImportState, templateImportErrorMessage } = store(),
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
                            description={getI18nValue(
                                `Template_Import_${templateImportState}`
                            )}
                        />
                    );
                }
                default: {
                    return standardMessage(
                        getI18nValue(`Template_Import_${templateImportState}`)
                    );
                }
            }
        };
    return <>{resolveProcessingContent()}</>;
};
