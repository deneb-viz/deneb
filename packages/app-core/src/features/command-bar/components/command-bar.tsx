import {
    makeStyles,
    tokens,
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

import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';
import { useDenebState } from '../../../state';
import { useSpecificationEditor } from '../../specification-editor';
import {
    type EditorPaneRole,
    handleEditorPaneConfig,
    handleEditorPaneSettings,
    handleEditorPaneSpecification,
    POPOVER_Z_INDEX,
    PREVIEW_PANE_TOOLBAR_BUTTON_PADDING,
    PREVIEW_PANE_TOOLBAR_MIN_SIZE
} from '../../../lib';
import { ToolbarButtonStandard } from '../../../components/ui';

const useCommandBarStyles = makeStyles({
    buttonSmall: {
        padding: `${PREVIEW_PANE_TOOLBAR_BUTTON_PADDING}px`
    },
    buttonAutoApplyEnabled: {
        backgroundColor: tokens.colorNeutralBackground1Selected,
        color: tokens.colorBrandForeground1
    },
    buttonZoomLevel: { minWidth: '50px' },
    buttonZoomIn: { marginLeft: '-8px' },
    buttonZoomOut: { marginRight: '-8px' },
    controlBaseZoomLevel: {
        display: 'flex',
        flexBasis: '100%',
        flexDirection: 'column',
        '> label': {
            marginBottom: tokens.spacingVerticalXXS
        }
    },
    menuButtonApply: {
        width: '165px',
        maxWidth: '165px',
        '& button': {
            minWidth: '145px',
            justifyContent: 'start',
            fontWeight: 'normal'
        }
    },
    menuButtonApplyList: {
        width: '155px',
        maxWidth: '155px',
        zIndex: POPOVER_Z_INDEX
    },
    popoverZoomLevel: {
        zIndex: POPOVER_Z_INDEX
    },
    spinButtonZoomCustom: {
        marginLeft: '40px',
        width: '80px'
    },
    toolbarAdvancedEditor: {
        backgroundColor: tokens.colorNeutralBackground1,
        display: 'flex',
        justifyContent: 'space-between'
    },
    toolbarAdvancedEditorGrow: {
        backgroundColor: tokens.colorNeutralBackground1,
        display: 'flex',
        justifyContent: 'normal',
        columnGap: tokens.spacingHorizontalXXS,
        flexGrow: 1
    },
    toolbarDebug: {
        borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
        display: 'flex',
        height: `${PREVIEW_PANE_TOOLBAR_MIN_SIZE}px`,
        justifyContent: 'space-between',
        paddingBottom: tokens.spacingVerticalNone,
        paddingTop: tokens.spacingVerticalNone
    },
    toolbarGroupAdvancedEditor: {
        columnGap: tokens.spacingHorizontalXXS,
        display: 'flex'
    },
    toolbarGroupDebug: {
        alignItems: 'center',
        columnGap: tokens.spacingHorizontalXXS,
        display: 'flex'
    }
});

export const CommandBar = () => {
    const { editorSelectedOperation } = useDenebState((state) => ({
        editorSelectedOperation: state.editorSelectedOperation
    }));
    const editorRefs = useSpecificationEditor();
    const classes = useCommandBarStyles();
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
        </Toolbar>
    );
};
