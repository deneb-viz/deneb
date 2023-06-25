import React from 'react';

import { useHotkeys } from 'react-hotkeys-hook';

import { VisualInterface } from './visual-interface';
import {
    getCommandKey,
    hotkeyOptions,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomFit,
    handleApply,
    handleFocusFirstPivot,
    handleAutoApply,
    handleFormat,
    handleEditorPane,
    handleHelp,
    handleNewSpecification,
    handleExportTemplate,
    handleNavSpec,
    handleNavConfig,
    handleNavSettings,
    handleMapFields,
    handleDebugPane,
    handleEditorDebugPaneData,
    handleEditorDebugPaneSignal,
    handleEditorDebugPaneLog
} from '../core/ui/commands';
import { logRender } from '../features/logging';

const App = () => {
    const hotkeyHandler = (command: string, callback: () => void) =>
        useHotkeys(getCommandKey(command), callback, hotkeyOptions);
    hotkeyHandler('applyChanges', handleApply);
    hotkeyHandler('autoApplyToggle', handleAutoApply);
    hotkeyHandler('repairFormatJson', handleFormat);
    hotkeyHandler('newSpecification', handleNewSpecification);
    hotkeyHandler('newTemplate', handleExportTemplate);
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
