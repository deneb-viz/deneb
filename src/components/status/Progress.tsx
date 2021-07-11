import * as React from 'react';

import { ProgressIndicator } from '@fluentui/react/lib/ProgressIndicator';

import { IProgressProps } from '../../types';

export const Progress = (props: IProgressProps) => {
    return <ProgressIndicator description={props.description} />;
};

export default Progress;
