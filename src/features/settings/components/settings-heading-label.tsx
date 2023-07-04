import React from 'react';
import { Label, LabelProps } from '@fluentui/react-components';
import { useSettingsStyles } from '.';

export const SettingsHeadingLabel: React.FC<LabelProps> = (props) => {
    const classes = useSettingsStyles();
    return (
        <div className={classes.headingContainer}>
            <Label weight='semibold' {...props} />
        </div>
    );
};
