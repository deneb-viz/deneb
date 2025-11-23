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

import store from '../../../store';
import { AdvancedEditorToolbarUpdateOperations } from './advanced-editor-toolbar-update-operations';
import { useToolbarStyles } from '.';
import {
    handleEditorPaneConfig,
    handleEditorPaneSettings,
    handleEditorPaneSpecification
} from '../../commands';
import {
    useSpecificationEditor,
    type EditorPaneRole
} from '@deneb-viz/app-core';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';

export const AdvancedEditorToolbar: React.FC = () => {
    const { editorSelectedOperation } = store(
        (state) => ({
            editorSelectedOperation: state.editorSelectedOperation
        }),
        shallow
    );
    const editorRefs = useSpecificationEditor();
    const classes = useToolbarStyles();
    const onPaneModeChange: ToolbarProps['onCheckedValueChange'] = (
        e,
        { checkedItems }
    ) => {
        const role = checkedItems[0] as EditorPaneRole;
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
            </ToolbarGroup>
            <AdvancedEditorToolbarUpdateOperations />
        </Toolbar>
    );
};
