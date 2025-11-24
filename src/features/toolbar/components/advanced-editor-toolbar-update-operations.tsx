import React from 'react';
import { ToolbarDivider, ToolbarGroup } from '@fluentui/react-components';

import { ApplyMenuButton } from './apply-menu-button';
import { useToolbarStyles } from '.';
import { FEATURES } from '../../../../config';
import { ToolbarButtonStandard } from '@deneb-viz/app-core';

export const AdvancedEditorToolbarUpdateOperations: React.FC = () => {
    const classes = useToolbarStyles();
    return (
        <>
            <ToolbarGroup className={classes.toolbarAdvancedEditorGrow}>
                {(FEATURES.combined_apply_button && <ApplyMenuButton />) || (
                    <>
                        <ToolbarButtonStandard
                            command='applyChanges'
                            role='application'
                        />
                        <ToolbarButtonStandard
                            command='autoApplyToggle'
                            role='application'
                        />
                    </>
                )}
                {/* Tracking is now only used for export (#486) */}
                {/* <ToolbarButtonStandard
                    command='fieldMappings'
                    role='application'
                /> */}
            </ToolbarGroup>
            <ToolbarGroup className={classes.toolbarGroupAdvancedEditor}>
                <ToolbarButtonStandard
                    command='newSpecification'
                    role='application'
                />
                <ToolbarButtonStandard
                    command='exportSpecification'
                    role='application'
                />
                <ToolbarDivider />
                <ToolbarButtonStandard
                    command='themeToggle'
                    role='application'
                />
                <ToolbarButtonStandard command='helpSite' role='application' />
            </ToolbarGroup>
        </>
    );
};
