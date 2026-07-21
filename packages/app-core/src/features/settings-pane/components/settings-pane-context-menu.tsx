import { useMemo } from 'react';
import {
    Menu,
    MenuItem,
    MenuList,
    MenuPopover
} from '@fluentui/react-components';

/**
 * Props for the settings pane context menu. The menu is fully callback-driven
 * — it reads nothing from the Zustand store directly. The host component
 * (`SettingsPane`) owns menu open state, anchor coordinates, and the
 * expand/collapse handlers that mutate the pane's local `openItems`.
 */
export type SettingsPaneContextMenuProps = {
    /** Whether the menu is currently open. */
    open: boolean;
    /**
     * The rect to anchor the menu to. Usually a 1x1 rect derived from the
     * triggering mouse event's client coords; for `Shift+F10` / Menu key, the
     * focused element's bounding rect. `null` while the menu is closed.
     */
    anchorRect: DOMRect | null;
    /** Controlled open-state callback forwarded to Fluent's `Menu`. */
    onOpenChange: (open: boolean) => void;
    /** Expand all currently-visible accordion sections. */
    onExpandAll: () => void;
    /** Collapse all accordion sections. */
    onCollapseAll: () => void;
    /** i18n lookup used for the two `MenuItem` labels. */
    translate: (key: string) => string;
};

/**
 * Right-click / `Shift+F10` context menu for the settings pane. Exposes two
 * items — "Expand all categories" and "Collapse all categories" — that are
 * filter-aware at the call site: "Expand all" only expands currently-visible
 * sections when a query is active.
 */
export const SettingsPaneContextMenu = ({
    open,
    anchorRect,
    onOpenChange,
    onExpandAll,
    onCollapseAll,
    translate
}: SettingsPaneContextMenuProps) => {
    // Fluent's `positioning` accepts a virtual element with `getBoundingClientRect`.
    const virtualElement = useMemo(
        () =>
            anchorRect
                ? { getBoundingClientRect: () => anchorRect }
                : undefined,
        [anchorRect]
    );
    const handleExpand = () => {
        onExpandAll();
        onOpenChange(false);
    };
    const handleCollapse = () => {
        onCollapseAll();
        onOpenChange(false);
    };
    return (
        <Menu
            open={open}
            onOpenChange={(_event, data) => onOpenChange(data.open)}
            positioning={{ target: virtualElement }}
        >
            <MenuPopover>
                <MenuList>
                    <MenuItem onClick={handleExpand}>
                        {translate('Text_Settings_ExpandAll')}
                    </MenuItem>
                    <MenuItem onClick={handleCollapse}>
                        {translate('Text_Settings_CollapseAll')}
                    </MenuItem>
                </MenuList>
            </MenuPopover>
        </Menu>
    );
};
