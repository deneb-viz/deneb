import * as React from 'react';

import { useHotkeys } from 'react-hotkeys-hook';

import MainInterface from './MainInterface';
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
    handleNavSettings
} from '../core/ui/commands';

const App = () => {
    useHotkeys(getCommandKey('applyChanges'), handleApply, hotkeyOptions);
    useHotkeys(
        getCommandKey('autoApplyToggle'),
        handleAutoApply,
        hotkeyOptions
    );
    useHotkeys(getCommandKey('repairFormatJson'), handleFormat, hotkeyOptions);
    useHotkeys(
        getCommandKey('newSpecification'),
        handleNewSpecification,
        hotkeyOptions
    );
    useHotkeys(
        getCommandKey('newTemplate'),
        handleExportTemplate,
        hotkeyOptions
    );
    useHotkeys(getCommandKey('openHelpUrl'), handleHelp, hotkeyOptions);
    useHotkeys(
        getCommandKey('navigateSpecification'),
        handleNavSpec,
        hotkeyOptions
    );
    useHotkeys(getCommandKey('navigateConfig'), handleNavConfig, hotkeyOptions);
    useHotkeys(
        getCommandKey('navigateSettings'),
        handleNavSettings,
        hotkeyOptions
    );
    useHotkeys(getCommandKey('zoomIn'), handleZoomIn, hotkeyOptions);
    useHotkeys(getCommandKey('zoomOut'), handleZoomOut, hotkeyOptions);
    useHotkeys(getCommandKey('zoomReset'), handleZoomReset, hotkeyOptions);
    useHotkeys(getCommandKey('zoomFit'), handleZoomFit, hotkeyOptions);
    useHotkeys(
        getCommandKey('toggleEditorPane'),
        handleEditorPane,
        hotkeyOptions
    );
    useHotkeys(
        getCommandKey('editorFocusOut'),
        handleFocusFirstPivot,
        hotkeyOptions
    );
    return <MainInterface />;
};

export default App;
