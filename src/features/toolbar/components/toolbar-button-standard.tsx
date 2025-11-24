import React, { useState } from 'react';
import {
    ToolbarButton,
    Tooltip,
    mergeClasses
} from '@fluentui/react-components';
import {
    ChevronDownRegular,
    ChevronLeftRegular,
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
import { shallow } from 'zustand/shallow';

import store, { getState } from '../../../store';
import { useToolbarStyles } from '.';
import {
    handleZoomFit,
    type ToolbarRole,
    TooltipCustomMount,
    useSpecificationEditor,
    type Command,
    handleExportSpecification,
    handleToggleEditorPane,
    handleZoomIn,
    handleZoomOut,
    handleToggleDebugPane,
    handleOpenWebsite,
    handleToggleEditorTheme,
    handleOpenCreateSpecificationDialog,
    handleApplyChanges,
    handleAutoApplyChanges
} from '@deneb-viz/app-core';
import { getI18nValue } from '@deneb-viz/powerbi-compat/visual-host';

interface IToolbarButtonProps {
    command: Command;
    role: ToolbarRole;
}

export const ToolbarButtonStandard: React.FC<IToolbarButtonProps> = ({
    command,
    role
}) => {
    const { commands } = store(
        (state) => ({
            commands: state.commands
        }),
        shallow
    );
    const classes = useToolbarStyles();
    const i18nKey = getI18nValue(resolveI18nKey(command));
    const icon = resolveIcon(command);
    const caption = resolveCaption(command);
    const buttonClass = mergeClasses(
        role === 'debug' ? classes.buttonSmall : '',
        resolveClasses(command)
    );
    const editorRefs = useSpecificationEditor();
    const handleClick = () => resolveClick(command)(editorRefs);
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
                    disabled={!commands[command]}
                >
                    {caption}
                </ToolbarButton>
            </Tooltip>
            <TooltipCustomMount setRef={setRef} />
        </>
    );
};

const resolveCaption = (command: Command) => {
    const { editorZoomLevel } = getState();
    switch (command) {
        case 'zoomLevel':
            return `${editorZoomLevel}%`;
        default:
            return null;
    }
};

const resolveClick = (command: Command) => {
    switch (command) {
        case 'applyChanges':
            return handleApplyChanges;
        case 'autoApplyToggle':
            return handleAutoApplyChanges;
        case 'debugPaneToggle':
            return handleToggleDebugPane;
        case 'editorPaneToggle':
            return handleToggleEditorPane;
        case 'exportSpecification':
            return handleExportSpecification;
        // Tracking is now only used for export (#486)
        // case 'fieldMappings':
        //     return handleOpenRemapDialog;
        case 'helpSite':
            return handleOpenWebsite;
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
        editorPreviewDebugIsExpanded,
        editor: { applyMode, isDirty },
        visualSettings: {
            editor: {
                interface: {
                    theme: { value: theme }
                }
            }
        }
    } = getState();
    switch (command) {
        case 'applyChanges':
            return 'Button_Apply';
        case 'autoApplyToggle':
            return applyMode === 'Manual'
                ? 'Button_Auto_Apply_On'
                : 'Button_Auto_Apply_Off';
        case 'debugPaneToggle':
            return editorPreviewDebugIsExpanded
                ? 'Tooltip_Collapse_Debug_Pane'
                : 'Tooltip_Expand_Debug_Pane';
        case 'editorPaneToggle':
            return 'Tooltip_Collapse_Editor_Pane';
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
            return 'Zoom_Level_Tooltip';
        case 'zoomOut':
            return 'Button_ZoomOut';
        default:
            return '';
    }
};

const resolveIcon = (command: Command) => {
    const {
        editorPreviewDebugIsExpanded,
        visualSettings: {
            editor: {
                interface: {
                    theme: { value: theme }
                }
            }
        }
    } = getState();
    switch (command) {
        case 'applyChanges':
            return <PlayRegular />;
        case 'autoApplyToggle':
            return <ReplayRegular />;
        case 'debugPaneToggle':
            return editorPreviewDebugIsExpanded ? (
                <ChevronDownRegular />
            ) : (
                <ChevronUpRegular />
            );
        case 'editorPaneToggle':
            return <ChevronLeftRegular />;
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
    } = getState();
    const classes = useToolbarStyles();
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
