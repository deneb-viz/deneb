import { IButtonStyles } from '@fluentui/react/lib/Button';

import { theme } from '../../api/fluent';
import { TEditorPosition } from '../../api/ui';
import { mergeStyleSets } from '@fluentui/react';
import { getState } from '../../store';
import { commandBarButtonStyles } from './commandBar';
import { TDatasetFieldType } from '../template/schema';

const previewCommandBarHeight = 26;

export const iconButtonStyles: IButtonStyles = {
    root: {
        boxSizing: 'border-box',
        display: 'flex',
        selectors: {
            '&:hover': { background: theme.palette.neutralLight },
            '&:focus': { background: theme.palette.neutralLighterAlt }
        }
    },
    icon: { color: theme.palette.neutralPrimary },
    iconHovered: { color: theme.palette.neutralDark },
    iconPressed: { color: theme.palette.neutralDark },
    label: { color: theme.palette.neutralPrimary },
    labelHovered: { color: theme.palette.neutralDark }
};

export const zoomIconButtonStyles: IButtonStyles = mergeStyleSets(
    commandBarButtonStyles,
    {
        root: {
            height: previewCommandBarHeight,
            width: previewCommandBarHeight
        },
        icon: {
            fontSize: 12,
            height: 14,
            margin: '0px 2px',
            color: theme.palette.neutralPrimary
        },
        rootHovered: { backgroundColor: theme.palette.neutralLighterAlt },
        rootDisabled: { backgroundColor: theme.palette.neutralLighterAlt }
    }
);

export const getAutoApplyIcon = (enabled: boolean) =>
    enabled ? 'CircleStopSolid' : 'PlaybackRate1x';

/**
 * For a given column or measure (or template placeholder), resolve the UI icon for its data type.
 */
export const getDataTypeIcon = (type: TDatasetFieldType) => {
    switch (type) {
        case 'bool':
            return 'ToggleRight';
        case 'text':
            return 'HalfAlpha';
        case 'numeric':
            return 'NumberSymbol';
        case 'dateTime':
            return 'Calendar';
        default:
            return 'Unknown';
    }
};

export const getEditorHeadingIcon = (
    position: TEditorPosition,
    expanded: boolean
) =>
    (position === 'left' && expanded) || (position === 'right' && !expanded)
        ? 'ChevronLeft'
        : 'ChevronRight';

export const isZoomInIconDisabled = () =>
    getState().zoom.value === getState().zoom.max || isZoomControlDisabled();

export const isZoomOutIconDisabled = () =>
    getState().zoom.value === getState().zoom.min || isZoomControlDisabled();

export const isZoomResetIconDisabled = () =>
    getState().zoom.value === getState().zoom.default ||
    isZoomControlDisabled();

export const isZoomControlDisabled = () =>
    getState()?.visual?.spec?.status !== 'valid';
