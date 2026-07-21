import { describe, expect, it } from 'vitest';

import { PROCESSING_DATA_MESSAGE_ARIA_PROPS } from '../processing-data-message-aria';

describe('PROCESSING_DATA_MESSAGE_ARIA_PROPS', () => {
    it('sets aria-busy to true so assistive technology knows the table is loading', () => {
        expect(PROCESSING_DATA_MESSAGE_ARIA_PROPS['aria-busy']).toBe(true);
    });

    it('exposes only the aria-busy key — no separate live region (Spinner label handles announcement)', () => {
        expect(Object.keys(PROCESSING_DATA_MESSAGE_ARIA_PROPS)).toEqual([
            'aria-busy'
        ]);
    });
});
