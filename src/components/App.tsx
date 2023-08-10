import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { VisualInterface } from '../features/interface';
import {
    getCommandKey,
    hotkeyOptions,
    handleApply,
    handleFocusFirstPivot,
    handleAutoApply,
    handleFormat,
    handleEditorPane,
    handleHelp,
    handleNewSpecification,
    handleNavSpec,
    handleNavConfig,
    handleNavSettings,
    handleMapFields,
    handleDebugPane,
    handleEditorDebugPaneData,
    handleEditorDebugPaneSignal,
    handleEditorDebugPaneLog
} from '../core/ui/commands';
import {
    handleExportSpecification,
    handleZoomFit,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset
} from '../features/commands';
import { logRender } from '../features/logging';

const App = () => {
    const hotkeyHandler = (command: string, callback: () => void) =>
        useHotkeys(getCommandKey(command), callback, hotkeyOptions);
    hotkeyHandler('applyChanges', handleApply);
    hotkeyHandler('autoApplyToggle', handleAutoApply);
    hotkeyHandler('repairFormatJson', handleFormat);
    hotkeyHandler('newSpecification', handleNewSpecification);
    hotkeyHandler('exportSpecification', handleExportSpecification);
    hotkeyHandler('mapFields', handleMapFields);
    hotkeyHandler('openHelpUrl', handleHelp);
    hotkeyHandler('navigateSpecification', handleNavSpec);
    hotkeyHandler('navigateConfig', handleNavConfig);
    hotkeyHandler('navigateSettings', handleNavSettings);
    hotkeyHandler('zoomIn', handleZoomIn);
    hotkeyHandler('zoomOut', handleZoomOut);
    hotkeyHandler('zoomReset', handleZoomReset);
    hotkeyHandler('zoomFit', handleZoomFit);
    hotkeyHandler('toggleEditorPane', handleEditorPane);
    hotkeyHandler('toggleDebugPane', handleDebugPane);
    hotkeyHandler('debugPaneShowData', handleEditorDebugPaneData);
    hotkeyHandler('debugPaneShowSignals', handleEditorDebugPaneSignal);
    hotkeyHandler('debugPaneShowLogs', handleEditorDebugPaneLog);
    hotkeyHandler('editorFocusOut', handleFocusFirstPivot);
    logRender('App');
    return <VisualInterface />;
};

export default App;
