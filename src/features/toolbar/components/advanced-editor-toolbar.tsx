import React from 'react';
import {
    Toolbar,
    ToolbarDivider,
    ToolbarGroup,
    ToolbarProps,
    ToolbarRadioButton,
    ToolbarRadioGroup
} from '@fluentui/react-components';
import {
    DataHistogramFilled,
    SettingsRegular,
    TextEditStyleRegular
} from '@fluentui/react-icons';
import { shallow } from 'zustand/shallow';

import { getI18nValue } from '../../i18n';
import store from '../../../store';
import { TEditorRole } from '../../json-editor';
import { ApplyMenuButton } from './apply-menu-button';
import { ToolbarButtonStandard } from './toolbar-button-standard';
import { useToolbarStyles } from '.';
import {
    handleEditorPaneConfig,
    handleEditorPaneSettings,
    handleEditorPaneSpecification
} from '../../commands';
import { isFeatureEnabled } from '../../../core/utils/features';

const COMBINED_APPLY_BUTTON = isFeatureEnabled('combinedApplyButton');

export const AdvancedEditorToolbar: React.FC = () => {
    const { editorSelectedOperation } = store(
        (state) => ({ editorSelectedOperation: state.editorSelectedOperation }),
        shallow
    );
    const classes = useToolbarStyles();
    const onPaneModeChange: ToolbarProps['onCheckedValueChange'] = (
        e,
        { checkedItems }
    ) => {
        const role = checkedItems[0] as TEditorRole;
        switch (role) {
            case 'spec':
                handleEditorPaneSpecification();
                break;
            case 'config':
                handleEditorPaneConfig();
                break;
            case 'settings':
                handleEditorPaneSettings();
                break;
        }
    };
    return (
        <Toolbar
            onCheckedValueChange={onPaneModeChange}
            checkedValues={{ editorMode: [editorSelectedOperation] }}
            className={classes.toolbarAdvancedEditor}
        >
            <ToolbarGroup className={classes.toolbarGroupAdvancedEditor}>
                <ToolbarRadioGroup
                    className={classes.toolbarGroupAdvancedEditor}
                >
                    <ToolbarRadioButton
                        name='editorMode'
                        value='spec'
                        appearance='subtle'
                        icon={<DataHistogramFilled />}
                    >
                        {getI18nValue('Editor_Role_Spec')}
                    </ToolbarRadioButton>
                    <ToolbarRadioButton
                        name='editorMode'
                        value='config'
                        appearance='subtle'
                        icon={<TextEditStyleRegular />}
                    >
                        {getI18nValue('Editor_Role_Config')}
                    </ToolbarRadioButton>
                    <ToolbarRadioButton
                        name='editorMode'
                        value='settings'
                        appearance='subtle'
                        icon={<SettingsRegular />}
                    >
                        {getI18nValue('Editor_Role_Settings')}
                    </ToolbarRadioButton>
                </ToolbarRadioGroup>
                <ToolbarDivider />
                {(COMBINED_APPLY_BUTTON && <ApplyMenuButton />) || (
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
                <ToolbarButtonStandard
                    command='formatJson'
                    role='application'
                />
                <ToolbarButtonStandard
                    command='fieldMappings'
                    role='application'
                />
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
                <ToolbarButtonStandard command='helpSite' role='application' />
            </ToolbarGroup>
        </Toolbar>
    );
};
