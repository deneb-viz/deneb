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
import { TEditorRole, useJsonEditorContext } from '../../json-editor';
import { ApplyMenuButton } from './apply-menu-button';
import { ToolbarButtonStandard } from './toolbar-button-standard';
import { useToolbarStyles } from '.';
import {
    handleEditorPaneConfig,
    handleEditorPaneSettings,
    handleEditorPaneSpecification
} from '../../commands';
import { FEATURES } from '../../../../config';

export const AdvancedEditorToolbar: React.FC = () => {
    const { editorSelectedOperation } = store(
        (state) => ({ editorSelectedOperation: state.editorSelectedOperation }),
        shallow
    );
    const editorRefs = useJsonEditorContext();
    const classes = useToolbarStyles();
    const onPaneModeChange: ToolbarProps['onCheckedValueChange'] = (
        e,
        { checkedItems }
    ) => {
        const role = checkedItems[0] as TEditorRole;
        switch (role) {
            case 'Spec':
                handleEditorPaneSpecification(editorRefs);
                break;
            case 'Config':
                handleEditorPaneConfig(editorRefs);
                break;
            case 'Settings':
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
                        value='Spec'
                        appearance='subtle'
                        icon={<DataHistogramFilled />}
                    >
                        {getI18nValue('Editor_Role_Spec')}
                    </ToolbarRadioButton>
                    <ToolbarRadioButton
                        name='editorMode'
                        value='Config'
                        appearance='subtle'
                        icon={<TextEditStyleRegular />}
                    >
                        {getI18nValue('Editor_Role_Config')}
                    </ToolbarRadioButton>
                    <ToolbarRadioButton
                        name='editorMode'
                        value='Settings'
                        appearance='subtle'
                        icon={<SettingsRegular />}
                    >
                        {getI18nValue('Editor_Role_Settings')}
                    </ToolbarRadioButton>
                </ToolbarRadioGroup>
                <ToolbarDivider />
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
                <ToolbarButtonStandard
                    command='themeToggle'
                    role='application'
                />
                <ToolbarButtonStandard command='helpSite' role='application' />
            </ToolbarGroup>
        </Toolbar>
    );
};
