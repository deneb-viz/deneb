import React, { useState } from 'react';
import {
    ToolbarButton,
    Tooltip,
    mergeClasses
} from '@fluentui/react-components';
import {
    ArrowShuffleRegular,
    ChevronDownRegular,
    ChevronUpRegular,
    DocumentRegular,
    PlayRegular,
    QuestionRegular,
    ReplayRegular,
    ShareRegular,
    TextGrammarWandRegular,
    WeatherMoonRegular,
    WeatherSunnyRegular,
    ZoomFitRegular,
    ZoomInRegular,
    ZoomOutRegular
} from '@fluentui/react-icons';
import { shallow } from 'zustand/shallow';

import store, { getState } from '../../../store';
import { useToolbarStyles } from '.';
import { getI18nValue } from '../../i18n';
import {
    Command,
    handleApplyChanges,
    handleAutoApplyChanges,
    handleExportSpecification,
    handleFormatJson,
    handleOpenCreateSpecificationDialog,
    handleOpenRemapDialog,
    handleOpenWebsite,
    handleToggleDebugPane,
    handleToggleEditorTheme,
    handleZoomFit,
    handleZoomIn,
    handleZoomOut
} from '../../commands';
import { ToolbarRole } from '../types';
import { TooltipCustomMount } from '../../interface';
import { useJsonEditorContext } from '../../json-editor';

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
    const { spec, config } = useJsonEditorContext();
    const handleClick = () =>
        resolveClick(command)(spec?.current.editor, config?.current.editor);
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
        case 'exportSpecification':
            return handleExportSpecification;
        case 'fieldMappings':
            return handleOpenRemapDialog;
        case 'formatJson':
            return handleFormatJson;
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
        editor: { applyMode },
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
        case 'exportSpecification':
            return 'Button_Export';
        case 'fieldMappings':
            return 'Button_Map_Fields';
        case 'formatJson':
            return 'Button_Format_Json';
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
        case 'exportSpecification':
            return <ShareRegular />;
        case 'fieldMappings':
            return <ArrowShuffleRegular />;
        case 'formatJson':
            return <TextGrammarWandRegular />;
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
