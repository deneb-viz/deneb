import * as React from 'react';

import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';

import store from '../../store';
import { Progress } from './Progress';
import { i18nValue } from '../../core/ui/i18n';

const ImportTemplateStatus: React.FC = () => {
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
                            description={i18nValue(
                                `Template_Import_${templateImportState}`
                            )}
                        />
                    );
                }
                default: {
                    return standardMessage(
                        i18nValue(`Template_Import_${templateImportState}`)
                    );
                }
            }
        };
    return <>{resolveProcessingContent()}</>;
};

export default ImportTemplateStatus;
