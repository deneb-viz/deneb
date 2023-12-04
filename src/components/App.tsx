import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { VisualInterface } from '../features/interface';
import {
    Command,
    HOTKEY_OPTIONS,
    handleApplyChanges,
    handleAutoApplyChanges,
    handleDebugPaneData,
    handleDebugPaneLog,
    handleDebugPaneSignal,
    handleEditorPaneConfig,
    handleEditorPaneSettings,
    handleEditorPaneSpecification,
    handleExportSpecification,
    handleFocusSpecificationEditor,
    handleFormatJson,
    handleOpenCreateSpecificationDialog,
    handleOpenRemapDialog,
    handleOpenWebsite,
    handleToggleDebugPane,
    handleToggleEditorPane,
    handleZoomFit,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset
} from '../features/commands';
import { logRender } from '../features/logging';
import { KEY_BINDINGS } from '../../config';

const App = () => {
    const hotkeyHandler = (command: Command, callback: () => void) =>
        useHotkeys(getCommandKey(command), callback, HOTKEY_OPTIONS);
    hotkeyHandler('applyChanges', handleApplyChanges);
    hotkeyHandler('autoApplyToggle', handleAutoApplyChanges);
    hotkeyHandler('formatJson', handleFormatJson);
    hotkeyHandler('newSpecification', handleOpenCreateSpecificationDialog);
    hotkeyHandler('exportSpecification', handleExportSpecification);
    hotkeyHandler('fieldMappings', handleOpenRemapDialog);
    hotkeyHandler('helpSite', handleOpenWebsite);
    hotkeyHandler('navigateSpecification', handleEditorPaneSpecification);
    hotkeyHandler('navigateConfig', handleEditorPaneConfig);
    hotkeyHandler('navigateSettings', handleEditorPaneSettings);
    hotkeyHandler('zoomIn', handleZoomIn);
    hotkeyHandler('zoomOut', handleZoomOut);
    hotkeyHandler('zoomReset', handleZoomReset);
    hotkeyHandler('zoomFit', handleZoomFit);
    hotkeyHandler('editorPaneToggle', handleToggleEditorPane);
    hotkeyHandler('debugPaneToggle', handleToggleDebugPane);
    hotkeyHandler('debugPaneShowData', handleDebugPaneData);
    hotkeyHandler('debugPaneShowSignals', handleDebugPaneSignal);
    hotkeyHandler('debugPaneShowLogs', handleDebugPaneLog);
    hotkeyHandler('editorFocusOut', handleFocusSpecificationEditor);
    logRender('App');
    return <VisualInterface />;
};

/**
 * Convenience method to get key binding details from configuration for the specified command.
 */
const getCommandKey = (command: Command): string =>
    KEY_BINDINGS?.[command]?.combination || '';

export default App;
