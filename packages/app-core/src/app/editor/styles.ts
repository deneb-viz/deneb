import { CSSProperties } from 'react';
import { tokens } from '@fluentui/react-components';

import { SPLIT_PANE_HANDLE_SIZE } from '../../lib';

const resizerBoxSizing = 'border-box';
const resizerBackgroundClip = 'padding-box';

const resizerStyles: CSSProperties = {
    background: tokens.colorNeutralBackground5,
    zIndex: 1,
    MozBoxSizing: resizerBoxSizing,
    WebkitBoxSizing: resizerBoxSizing,
    boxSizing: resizerBoxSizing,
    MozBackgroundClip: resizerBackgroundClip,
    WebkitBackgroundClip: resizerBackgroundClip,
    backgroundClip: resizerBackgroundClip,
    border: `1px solid ${tokens.colorNeutralStroke2}`
};

const resizerPaneStyles: CSSProperties = {
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    boxSizing: 'border-box'
};

export const RESIZER_PANE_VERTICAL_STYLES: CSSProperties = {
    ...resizerPaneStyles,
    ...{
        overflow: 'none'
    }
};

export const RESIZER_HORIZONTAL_STYLES: CSSProperties = {
    ...resizerStyles,
    ...{
        height: SPLIT_PANE_HANDLE_SIZE,
        minHeight: SPLIT_PANE_HANDLE_SIZE,
        cursor: 'row-resize'
    }
};

export const RESIZER_VERTICAL_STYLES: CSSProperties = {
    ...resizerStyles,
    ...{
        width: SPLIT_PANE_HANDLE_SIZE,
        minWidth: SPLIT_PANE_HANDLE_SIZE,
        cursor: 'col-resize'
    }
};
