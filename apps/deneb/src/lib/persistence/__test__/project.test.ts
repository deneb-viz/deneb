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

    it('should migrate to show menu without selector when interactivity is undefined (no interactivity block at all)', () => {
        const result = resolveContextMenuProperties(undefined);
        expect(result).toEqual([
            { name: 'enableContextMenu', value: true },
            { name: 'enableContextMenuSelector', value: false }
        ]);
    });

    it('should migrate to show menu without selector for empty object (contextMenu unspecified)', () => {
        const result = resolveContextMenuProperties({});
        expect(result).toEqual([
            { name: 'enableContextMenu', value: true },
            { name: 'enableContextMenuSelector', value: false }
        ]);
    });
});
