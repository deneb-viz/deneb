import React from 'react';
import {
    ToolbarButton,
    Tooltip,
    mergeClasses
} from '@fluentui/react-components';
import {
    ChevronDownRegular,
    ChevronUpRegular,
    ZoomFitRegular,
    ZoomInRegular,
    ZoomOutRegular
} from '@fluentui/react-icons';

import { DebugAreaCommand } from '../types';
import { getState } from '../../../store';
import {
    handleZoomFit,
    handleZoomIn,
    handleZoomOut,
    updatePreviewDebugPaneState
} from '../../../core/ui/commands';
import { resolveEditorDebugPaneToggleAria } from '../../../core/ui/aria';
import { i18nValue } from '../../../core/ui/i18n';
import { useDebugStyles } from '..';
import {
    isZoomControlDisabledReact,
    isZoomInIconDisabled,
    isZoomOutIconDisabled
} from '../../../core/ui/icons';

interface IDebugAreaToolbarButtonProps {
    command: DebugAreaCommand;
}

export const DebugAreaToolbarButton: React.FC<IDebugAreaToolbarButtonProps> = ({
    command
}) => {
    const classes = useDebugStyles();
    const i18nKey = i18nValue(resolveI18nKey(command));
    const icon = resolveIcon(command);
    const caption = resolveCaption(command);
    const buttonClass = mergeClasses(
        classes.toolbarButton,
        resolveClasses(command)
    );
    const handleClick = resolveClick(command);
    return (
        <Tooltip relationship='description' content={i18nKey} withArrow>
            <ToolbarButton
                className={buttonClass}
                onClick={handleClick}
                icon={icon}
                disabled={resolveDisabledState(command)}
            >
                {caption}
            </ToolbarButton>
        </Tooltip>
    );
};

const resolveCaption = (command: DebugAreaCommand) => {
    const { editorZoomLevel } = getState();
    switch (command) {
        case 'zoomLevel':
            return `${editorZoomLevel}%`;
        default:
            return null;
    }
};

const resolveClick = (command: DebugAreaCommand) => {
    switch (command) {
        case 'debugAreaToggle':
            return updatePreviewDebugPaneState;
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

const resolveDisabledState = (command: DebugAreaCommand) => {
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

const resolveI18nKey = (command: DebugAreaCommand) => {
    const { editorPreviewDebugIsExpanded } = getState();
    switch (command) {
        case 'debugAreaToggle':
            return resolveEditorDebugPaneToggleAria(
                editorPreviewDebugIsExpanded
            );
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

const resolveIcon = (command: DebugAreaCommand) => {
    const { editorPreviewDebugIsExpanded } = getState();
    switch (command) {
        case 'debugAreaToggle':
            return editorPreviewDebugIsExpanded ? (
                <ChevronDownRegular />
            ) : (
                <ChevronUpRegular />
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

const resolveClasses = (command: DebugAreaCommand) => {
    const classes = useDebugStyles();
    switch (command) {
        case 'zoomIn':
            return classes.zoomInButton;
        case 'zoomOut':
            return classes.zoomOutButton;
        default:
            return null;
    }
};
