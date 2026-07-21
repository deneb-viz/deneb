import { describe, expect, it } from 'vitest';

import enUS from '../../../../i18n/en-US.json';
import {
    ARIA_KEYSHORTCUTS_BY_PIVOT,
    TOOLTIP_KEY_BY_PIVOT
} from '../debug-toolbar-lookups';

/**
 * The two const lookups in `debug-toolbar.tsx` are the load-bearing wiring
 * between each pivot role and (1) its tooltip i18n key, (2) the
 * `aria-keyshortcuts` value rendered on the corresponding
 * `<ToolbarRadioButton>`. These tests assert the expected mappings,
 * exhaustive role coverage, and that every referenced i18n key resolves to a
 * non-empty value in `en-US.json` — guarding against a silently-omitted role
 * or a key that exists only in code with no catalog entry.
 */
describe('TOOLTIP_KEY_BY_PIVOT', () => {
    it('maps source to Tooltip_Pivot_Debug_Source', () => {
        expect(TOOLTIP_KEY_BY_PIVOT.source).toBe('Tooltip_Pivot_Debug_Source');
    });

    it('maps data to Tooltip_Pivot_Debug_Data', () => {
        expect(TOOLTIP_KEY_BY_PIVOT.data).toBe('Tooltip_Pivot_Debug_Data');
    });

    it('maps signal to Tooltip_Pivot_Debug_Signals', () => {
        expect(TOOLTIP_KEY_BY_PIVOT.signal).toBe('Tooltip_Pivot_Debug_Signals');
    });

    it('maps log to Tooltip_Pivot_Debug_Logs', () => {
        expect(TOOLTIP_KEY_BY_PIVOT.log).toBe('Tooltip_Pivot_Debug_Logs');
    });

    it('covers exactly the four DebugPaneRole values', () => {
        expect(Object.keys(TOOLTIP_KEY_BY_PIVOT).sort()).toEqual([
            'data',
            'log',
            'signal',
            'source'
        ]);
    });

    it('resolves every i18n key to a non-empty value in en-US.json', () => {
        const catalog = enUS as Record<string, string>;
        for (const key of Object.values(TOOLTIP_KEY_BY_PIVOT)) {
            expect(catalog[key], `missing i18n key: ${key}`).toBeTypeOf(
                'string'
            );
            expect(
                catalog[key].length,
                `empty i18n value: ${key}`
            ).toBeGreaterThan(0);
        }
    });
});

describe('ARIA_KEYSHORTCUTS_BY_PIVOT', () => {
    it('maps source to Control+Alt+6', () => {
        expect(ARIA_KEYSHORTCUTS_BY_PIVOT.source).toBe('Control+Alt+6');
    });

    it('maps data to Control+Alt+7', () => {
        expect(ARIA_KEYSHORTCUTS_BY_PIVOT.data).toBe('Control+Alt+7');
    });

    it('maps signal to Control+Alt+8', () => {
        expect(ARIA_KEYSHORTCUTS_BY_PIVOT.signal).toBe('Control+Alt+8');
    });

    it('maps log to Control+Alt+9', () => {
        expect(ARIA_KEYSHORTCUTS_BY_PIVOT.log).toBe('Control+Alt+9');
    });

    it('covers exactly the four DebugPaneRole values', () => {
        expect(Object.keys(ARIA_KEYSHORTCUTS_BY_PIVOT).sort()).toEqual([
            'data',
            'log',
            'signal',
            'source'
        ]);
    });
});
