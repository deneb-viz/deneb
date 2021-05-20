import * as React from 'react';

import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';

import Debugger from '../../Debugger';
import { IProgressProps } from '../../types';

export const Progress = (props: IProgressProps) => {
    Debugger.log('Rendering Component: [Progress]...');
    return <ProgressIndicator description={props.description} />;
};

export default Progress;
