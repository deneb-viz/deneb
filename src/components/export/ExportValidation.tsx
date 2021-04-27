import * as React from 'react';
import { useSelector } from 'react-redux';

import Debugger from '../../Debugger';
import { state } from '../../store';
import { Progress } from '../status/Progress';

export const ExportValidation = () => {
    Debugger.log('Rendering Component: [ExportValidation]...');
    const root = useSelector(state),
        { i18n } = root.visual;
    return (
        <Progress
            description={i18n.getDisplayName(`Template_Export_Validation`)}
        />
    );
};

export default ExportValidation;
