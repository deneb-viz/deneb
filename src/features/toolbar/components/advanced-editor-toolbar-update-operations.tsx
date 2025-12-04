import React from 'react';
import { ToolbarDivider, ToolbarGroup } from '@fluentui/react-components';

import { useToolbarStyles } from '.';
import { ToolbarButtonStandard } from '@deneb-viz/app-core';

export const AdvancedEditorToolbarUpdateOperations: React.FC = () => {
    const classes = useToolbarStyles();
    return (
        <>
            <ToolbarGroup className={classes.toolbarAdvancedEditorGrow}>
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
