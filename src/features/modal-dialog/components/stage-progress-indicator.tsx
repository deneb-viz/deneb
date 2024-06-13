import { Field, ProgressBar } from '@fluentui/react-components';
import React from 'react';

interface StageProgressIndicatorProps {
    message: string;
    isInProgress?: boolean;
    isCompleted?: boolean;
}

export const StageProgressIndicator: React.FC<StageProgressIndicatorProps> = ({
    message,
    isInProgress,
    isCompleted
}) => {
    const value = isCompleted ? 1 : isInProgress ? undefined : 0;
    return (
        <Field
            validationMessage={message}
            validationState={isCompleted ? 'success' : 'none'}
        >
            <ProgressBar value={value} />
        </Field>
    );
};
