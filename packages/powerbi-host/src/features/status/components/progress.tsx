import * as React from 'react';
import { Field, ProgressBar } from '@fluentui/react-components';

interface IProgressProps {
    description?: string;
}

export const Progress: React.FC<IProgressProps> = (props) => {
    return (
        <Field validationMessage={props.description} validationState='none'>
            <ProgressBar />
        </Field>
    );
};
