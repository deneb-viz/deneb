import { describe, expect, it } from 'vitest';
import { resolveContextMenuProperties } from '../context-menu-migration';

describe('resolveContextMenuProperties', () => {
    it('should pass through values for new templates with both fields', () => {
        const result = resolveContextMenuProperties({
            contextMenu: true,
            contextMenuSelector: false
        });
        expect(result).toEqual([
            { name: 'enableContextMenu', value: true },
            { name: 'enableContextMenuSelector', value: false }
        ]);
    });

    it('should pass through values when both fields are true', () => {
        const result = resolveContextMenuProperties({
            contextMenu: true,
            contextMenuSelector: true
        });
        expect(result).toEqual([
            { name: 'enableContextMenu', value: true },
            { name: 'enableContextMenuSelector', value: true }
        ]);
    });

    it('should migrate legacy template with contextMenu: false to show menu without selector', () => {
        const result = resolveContextMenuProperties({
            contextMenu: false
            // no contextMenuSelector — legacy template
        });
        expect(result).toEqual([
            { name: 'enableContextMenu', value: true },
            { name: 'enableContextMenuSelector', value: false }
        ]);
    });

    it('should default legacy template with contextMenu: true to both enabled', () => {
        const result = resolveContextMenuProperties({
            contextMenu: true
            // no contextMenuSelector — legacy template
        });
        expect(result).toEqual([
            { name: 'enableContextMenu', value: true },
            { name: 'enableContextMenuSelector', value: true }
        ]);
    });

    it('should default to contextMenu: false and contextMenuSelector: true when interactivity is undefined', () => {
        const result = resolveContextMenuProperties(undefined);
        expect(result).toEqual([
            { name: 'enableContextMenu', value: false },
            { name: 'enableContextMenuSelector', value: true }
        ]);
    });

    it('should default to contextMenu: false and contextMenuSelector: true for empty object', () => {
        const result = resolveContextMenuProperties({});
        expect(result).toEqual([
            { name: 'enableContextMenu', value: false },
            { name: 'enableContextMenuSelector', value: true }
        ]);
    });
});
