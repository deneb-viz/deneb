import { type UsermetaInteractivity } from '@deneb-viz/template-usermeta';

/**
 * Resolve context menu properties from template interactivity metadata,
 * handling legacy migration.
 *
 * Legacy templates (without contextMenuSelector) that had contextMenu: false
 * meant "no data point resolution" — not "suppress the menu entirely". This
 * remaps that case to enableContextMenu: true + enableContextMenuSelector: false.
 */
export const resolveContextMenuProperties = (
    interactivity?: Partial<UsermetaInteractivity>
) => {
    const isLegacy = interactivity?.contextMenuSelector === undefined;
    const legacyMenuOff = !(interactivity?.contextMenu ?? true);
    return [
        {
            name: 'enableContextMenu',
            value:
                isLegacy && legacyMenuOff
                    ? true
                    : (interactivity?.contextMenu ?? false)
        },
        {
            name: 'enableContextMenuSelector',
            value:
                isLegacy && legacyMenuOff
                    ? false
                    : (interactivity?.contextMenuSelector ?? true)
        }
    ];
};
