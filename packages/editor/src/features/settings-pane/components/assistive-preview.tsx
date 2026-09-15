import {
    makeStyles,
    tokens,
    typographyStyles
} from '@fluentui/react-components';

import type { HighlightRange } from '../search/types';
import { HighlightText } from './highlight-text';

const useAssistivePreviewStyles = makeStyles({
    root: {
        ...typographyStyles.caption1,
        color: tokens.colorNeutralForeground3,
        marginTop: tokens.spacingVerticalXXS,
        display: 'block'
    }
});

type AssistivePreviewProps = {
    text: string;
    ranges?: readonly HighlightRange[];
};

/**
 * Compact caption rendered beneath a row's label when the row matched
 * on assistive text only. Reuses `HighlightText` for the mark rendering
 * so the visual treatment matches the label. Returns `null` when there
 * is nothing to preview (no ranges or empty text).
 */
export const AssistivePreview = ({ text, ranges }: AssistivePreviewProps) => {
    const classes = useAssistivePreviewStyles();
    if (!text || !ranges || ranges.length === 0) return null;
    return (
        <HighlightText text={text} ranges={ranges} className={classes.root} />
    );
};
