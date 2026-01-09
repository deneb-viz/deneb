import { useHotkeys } from 'react-hotkeys-hook';

import {
    getCommandKey,
    handleApplyChanges,
    handleAutoApplyChanges,
    handleDebugPaneData,
    handleDebugPaneLog,
    handleDebugPaneSignal,
    handleEditorPaneConfig,
    handleEditorPaneSettings,
    handleEditorPaneSpecification,
    handleExportSpecification,
    handleOpenCreateSpecificationDialog,
    handleOpenWebsite,
    handleToggleDebugPane,
    handleToggleEditorTheme,
    handleZoomFit,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    HOTKEY_OPTIONS,
    type Command
} from '../../../lib';
import type { SpecificationEditorRefs } from '../../../features/specification-editor';

/**
 * Hook that registers all editor hotkey handlers.
 */
export const useEditorHotkeys = (
    editorRefs: SpecificationEditorRefs,
    launchUrl: (url: string) => void
) => {
    const hotkeyHandler = (command: Command, callback: () => void) =>
        useHotkeys(getCommandKey(command), callback, HOTKEY_OPTIONS);

    hotkeyHandler('applyChanges', () => handleApplyChanges(editorRefs));
    hotkeyHandler('autoApplyToggle', () => handleAutoApplyChanges(editorRefs));
    hotkeyHandler('newSpecification', handleOpenCreateSpecificationDialog);
    hotkeyHandler('exportSpecification', handleExportSpecification);
    hotkeyHandler('themeToggle', handleToggleEditorTheme);
    hotkeyHandler('helpSite', () => handleOpenWebsite(launchUrl));
    hotkeyHandler('navigateSpecification', () =>
        handleEditorPaneSpecification(editorRefs)
    );
    hotkeyHandler('navigateConfig', () => handleEditorPaneConfig(editorRefs));
    hotkeyHandler('navigateSettings', handleEditorPaneSettings);
    hotkeyHandler('zoomIn', handleZoomIn);
    hotkeyHandler('zoomOut', handleZoomOut);
    hotkeyHandler('zoomReset', handleZoomReset);
    hotkeyHandler('zoomFit', handleZoomFit);
    hotkeyHandler('debugPaneToggle', handleToggleDebugPane);
    hotkeyHandler('debugPaneShowData', handleDebugPaneData);
    hotkeyHandler('debugPaneShowSignals', handleDebugPaneSignal);
    hotkeyHandler('debugPaneShowLogs', handleDebugPaneLog);
};
