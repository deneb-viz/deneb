import { useState } from 'react';
import {
    ToolbarButton,
    Tooltip,
    makeStyles,
    mergeClasses,
    tokens
} from '@fluentui/react-components';
import {
    ChevronDownRegular,
    ChevronUpRegular,
    DocumentRegular,
    PlayRegular,
    QuestionRegular,
    ReplayRegular,
    ShareRegular,
    WeatherMoonRegular,
    WeatherSunnyRegular,
    ZoomFitRegular,
    ZoomInRegular,
    ZoomOutRegular
} from '@fluentui/react-icons';

import {
    PREVIEW_PANE_TOOLBAR_BUTTON_PADDING,
    getDenebState,
    useDenebState,
    TooltipCustomMount,
    useDenebPlatformProvider
} from '@deneb-viz/app-core';
import {
    handleApplyChanges,
    handleAutoApplyChanges,
    handleExportSpecification,
    handleOpenCreateSpecificationDialog,
    handleOpenWebsite,
    handleToggleDebugPane,
    handleToggleEditorTheme,
    handleZoomFit,
    handleZoomIn,
    handleZoomOut,
    selectCommandEnabled,
    type Command
} from '../../../lib/commands';
import { type ToolbarRole } from './types';
import { useSpecificationEditor } from '../../../context/specification-editor';

type ToolbarButtonStandardProps = {
    command: Command;
    role: ToolbarRole;
};

const useToolbarButtonStandardStyles = makeStyles({
    buttonSmall: {
        padding: `${PREVIEW_PANE_TOOLBAR_BUTTON_PADDING}px}`
    },
    buttonAutoApplyEnabled: {
        backgroundColor: tokens.colorNeutralBackground1Selected,
        color: tokens.colorBrandForeground1
    },
    buttonZoomIn: { marginLeft: '-8px' },
    buttonZoomOut: { marginRight: '-8px' }
});

export const ToolbarButtonStandard = ({
    command,
    role
}: ToolbarButtonStandardProps) => {
    // `commandEnabled` resolves via `selectCommandEnabled`, which derives
    // exportSpecification/zoom enablement rather than trusting the stored
    // `commands` slice for those two.
    const { commandEnabled, translate } = useDenebState((state) => ({
        commandEnabled: selectCommandEnabled(state, command),
        translate: state.i18n.translate
    }));
    const { launchUrl } = useDenebPlatformProvider();
    const classes = useToolbarButtonStandardStyles();
    const i18nKey = translate(resolveI18nKey(command));
    const icon = resolveIcon(command);
    const caption = resolveCaption(command);
    const buttonClass = mergeClasses(
        role === 'debug' ? classes.buttonSmall : '',
        resolveClasses(command)
    );
    const editorRefs = useSpecificationEditor();
    const handleClick = () => resolveClick(command, launchUrl)?.(editorRefs);
    const [ref, setRef] = useState<HTMLElement | null>();
    return (
        <>
            <Tooltip
                relationship='label'
                content={i18nKey}
                withArrow
                mountNode={ref}
            >
                <ToolbarButton
                    className={buttonClass}
                    onClick={handleClick}
                    icon={icon}
                    disabled={!commandEnabled}
                >
                    {caption}
                </ToolbarButton>
            </Tooltip>
            <TooltipCustomMount setRef={setRef} />
        </>
    );
};

const resolveCaption = (command: Command) => {
    const { editorZoomLevel } = getDenebState();
    switch (command) {
        case 'zoomLevel':
            return `${editorZoomLevel}%`;
        default:
            return null;
    }
};

const resolveClick = (command: Command, launchUrl: (url: string) => void) => {
    switch (command) {
        case 'applyChanges':
            return handleApplyChanges;
        case 'autoApplyToggle':
            return handleAutoApplyChanges;
        case 'debugPaneToggle':
            return handleToggleDebugPane;
        case 'exportSpecification':
            return handleExportSpecification;
        // Tracking is now only used for export (#486)
        // case 'fieldMappings':
        //     return handleOpenRemapDialog;
        case 'helpSite':
            return () => handleOpenWebsite(launchUrl);
        case 'newSpecification':
            return handleOpenCreateSpecificationDialog;
        case 'themeToggle':
            return handleToggleEditorTheme;
        case 'zoomFit':
            return handleZoomFit;
        case 'zoomIn':
            return handleZoomIn;
        case 'zoomOut':
            return handleZoomOut;
        default:
            return null;
    }
};

const resolveI18nKey = (command: Command) => {
    const {
        editor: { applyMode, isDebugPaneMinimized, isDirty },
        editorPreferences: { theme }
    } = getDenebState();
    switch (command) {
        case 'applyChanges':
            return 'Button_Apply';
        case 'autoApplyToggle':
            return applyMode === 'Manual'
                ? 'Button_Auto_Apply_On'
                : 'Button_Auto_Apply_Off';
        case 'debugPaneToggle':
            return !isDebugPaneMinimized
                ? 'Tooltip_Collapse_Debug_Pane'
                : 'Tooltip_Expand_Debug_Pane';
        case 'exportSpecification':
            return isDirty ? 'Button_Export_Dirty' : 'Button_Export';
        // Tracking is now only used for export (#486)
        // case 'fieldMappings':
        //     return 'Button_Map_Fields';
        case 'helpSite':
            return 'Button_Help';
        case 'newSpecification':
            return 'Button_New';
        case 'themeToggle':
            return theme === 'dark'
                ? 'Button_Theme_Dark'
                : 'Button_Theme_Light';
        case 'zoomFit':
            return 'Button_ZoomFit';
        case 'zoomIn':
            return 'Button_ZoomIn';
        case 'zoomLevel':
            return 'Tooltip_Zoom_Level';
        case 'zoomOut':
            return 'Button_ZoomOut';
        default:
            return '';
    }
};

const resolveIcon = (command: Command) => {
    const {
        editor: { isDebugPaneMinimized },
        editorPreferences: { theme }
    } = getDenebState();
    switch (command) {
        case 'applyChanges':
            return <PlayRegular />;
        case 'autoApplyToggle':
            return <ReplayRegular />;
        case 'debugPaneToggle':
            return !isDebugPaneMinimized ? (
                <ChevronDownRegular />
            ) : (
                <ChevronUpRegular />
            );
        case 'exportSpecification':
            return <ShareRegular />;
        // Tracking is now only used for export (#486)
        // case 'fieldMappings':
        //     return <ArrowShuffleRegular />;
        case 'helpSite':
            return <QuestionRegular />;
        case 'newSpecification':
            return <DocumentRegular />;
        case 'themeToggle':
            return theme === 'dark' ? (
                <WeatherMoonRegular />
            ) : (
                <WeatherSunnyRegular />
            );
        case 'zoomFit':
            return <ZoomFitRegular />;
        case 'zoomIn':
            return <ZoomInRegular />;
        case 'zoomOut':
            return <ZoomOutRegular />;
        default:
            return null;
    }
};

const resolveClasses = (command: Command) => {
    const {
        editor: { applyMode }
    } = getDenebState();
    const classes = useToolbarButtonStandardStyles();
    switch (command) {
        case 'autoApplyToggle':
            return applyMode === 'Auto' ? classes.buttonAutoApplyEnabled : '';
        case 'zoomIn':
            return classes.buttonZoomIn;
        case 'zoomOut':
            return classes.buttonZoomOut;
        default:
            return '';
    }
};
