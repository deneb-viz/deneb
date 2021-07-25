import * as React from 'react';

import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';

interface IProgressProps {
    description?: string;
}

export const Progress: React.FC<IProgressProps> = (props) => {
    return <ProgressIndicator description={props.description} />;
};

export default Progress;
