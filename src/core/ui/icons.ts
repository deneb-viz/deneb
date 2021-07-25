import { TEditorPosition } from '../../api/ui';

export const getEditorHeadingIcon = (
    position: TEditorPosition,
    expanded: boolean
) =>
    (position === 'left' && expanded) || (position === 'right' && !expanded)
        ? 'ChevronLeft'
        : 'ChevronRight';
