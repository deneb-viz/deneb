import React from 'react';
import { Caption1, TextProps } from '@fluentui/react-components';
import { useSettingsStyles } from '.';

export const SettingsTextSection: React.FC<TextProps> = (props) => {
    const classes = useSettingsStyles();
    return (
        <div className={classes.textSectionContainer}>
            <Caption1>{props.children}</Caption1>
        </div>
    );
};
