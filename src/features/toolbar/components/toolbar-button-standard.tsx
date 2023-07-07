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
    QuestionRegular,
    ShareRegular,
    TextGrammarWandRegular,
    ZoomFitRegular,
    ZoomInRegular,
    ZoomOutRegular
} from '@fluentui/react-icons';

import { getState } from '../../../store';
import {
    createExportableTemplate,
    createNewSpec,
    handleZoomFit,
    handleZoomIn,
    handleZoomOut,
    openHelpSite,
    openMapFieldsDialog,
    repairFormatJson,
    updatePreviewDebugPaneState
} from '../../../core/ui/commands';
import { useToolbarStyles } from '.';
import {
    isZoomControlDisabledReact,
    isZoomInIconDisabled,
    isZoomOutIconDisabled
} from '../../../core/ui/icons';
import { getI18nValue } from '../../i18n';
import { ToolbarCommand, ToolbarRole } from '../types';
import { TooltipCustomMount } from '../../interface';

interface IToolbarButtonProps {
    command: ToolbarCommand;
    role: ToolbarRole;
}

export const ToolbarButtonStandard: React.FC<IToolbarButtonProps> = ({
    command,
    role
}) => {
    const classes = useToolbarStyles();
    const i18nKey = getI18nValue(resolveI18nKey(command));
    const icon = resolveIcon(command);
    const caption = resolveCaption(command);
    const buttonClass = mergeClasses(
        role === 'debug' ? classes.buttonSmall : '',
        resolveClasses(command)
    );
    const handleClick = resolveClick(command);
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
                    disabled={resolveDisabledState(command)}
                >
                    {caption}
                </ToolbarButton>
            </Tooltip>
            <TooltipCustomMount setRef={setRef} />
        </>
    );
};

const resolveCaption = (command: ToolbarCommand) => {
    const { editorZoomLevel } = getState();
    switch (command) {
        case 'zoomLevel':
            return `${editorZoomLevel}%`;
        default:
            return null;
    }
};

const resolveClick = (command: ToolbarCommand) => {
    switch (command) {
        case 'debugAreaToggle':
            return updatePreviewDebugPaneState;
        case 'exportSpecification':
            return createExportableTemplate;
        case 'fieldMappings':
            return openMapFieldsDialog;
        case 'formatJson':
            return repairFormatJson;
        case 'helpSite':
            return openHelpSite;
        case 'newSpecification':
            return createNewSpec;
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

const resolveDisabledState = (command: ToolbarCommand) => {
    const { editorZoomLevel } = getState();
    switch (command) {
        case 'zoomFit':
            return isZoomControlDisabledReact();
        case 'zoomIn':
            return isZoomInIconDisabled(editorZoomLevel);
        case 'zoomOut':
            return isZoomOutIconDisabled(editorZoomLevel);
        default:
            return false;
    }
};

const resolveI18nKey = (command: ToolbarCommand) => {
    const { editorPreviewDebugIsExpanded } = getState();
    switch (command) {
        case 'debugAreaToggle':
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

const resolveIcon = (command: ToolbarCommand) => {
    const { editorPreviewDebugIsExpanded } = getState();
    switch (command) {
        case 'debugAreaToggle':
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

const resolveClasses = (command: ToolbarCommand) => {
    const classes = useToolbarStyles();
    switch (command) {
        case 'zoomIn':
            return classes.buttonZoomIn;
        case 'zoomOut':
            return classes.buttonZoomOut;
        default:
            return '';
    }
};
