import React from 'react';
import { Field, ProgressBar } from '@fluentui/react-components';

type StageProgressIndicatorProps = {
    message: string;
    isInProgress?: boolean;
    isCompleted?: boolean;
};

export const StageProgressIndicator = ({
    message,
    isInProgress,
    isCompleted
}: StageProgressIndicatorProps) => {
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
