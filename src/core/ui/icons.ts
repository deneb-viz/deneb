import { TEditorPosition } from '../../api/ui';

export const getAutoApplyIcon = (enabled: boolean) =>
    enabled ? 'CircleStopSolid' : 'PlaybackRate1x';

export const getEditorHeadingIcon = (
    position: TEditorPosition,
    expanded: boolean
) =>
    (position === 'left' && expanded) || (position === 'right' && !expanded)
        ? 'ChevronLeft'
        : 'ChevronRight';
