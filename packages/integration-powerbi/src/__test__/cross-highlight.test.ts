import {
    HIGHLIGHT_COMPARATOR_SUFFIX,
    HIGHLIGHT_FIELD_SUFFIX,
    HIGHLIGHT_STATUS_SUFFIX
} from '@deneb-viz/dataset/field';
import { getCrossHighlightRegExpAlternation } from '../cross-highlight';

describe('getCrossHighlightRegExpAlternation', () => {
    it('should return the expected alternation string', () => {
        const result = getCrossHighlightRegExpAlternation();
        const expected = `${HIGHLIGHT_COMPARATOR_SUFFIX}|${HIGHLIGHT_STATUS_SUFFIX}|${HIGHLIGHT_FIELD_SUFFIX}`;
        expect(result).toEqual(expected);
    });
});
