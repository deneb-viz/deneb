# Deneb - Commands API

Handles menu and keyboard commands within the visual.

-   [Constants](#constants)
-   [Methods](#methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

#### 🔒 `hotkeyOptions`

Constant specifying `react-hotkeys-hook` bindings for particular HTML elements.

## Methods

#### `applyChanges`()

Handle the Apply Changes command.

#### `closeModalDialog`(_type_)

Handle the necessary logic required to close down a modal dialog.

#### `createExportableTemplate`()

Handle the Generate JSON Template command.

#### `createNewSpec`()

Handle the Create New Spec command.

#### `discardChanges`()

Handle the discard operation from the apply dialog, if the editors are dirty and the creator exits without applying them.

#### `focusFirstPivot`()

'Escape hatch' method to set current window focus to the first pivot element (Specification). This is ideal for situations where the user might be inside an editor, where the tab key is bound to indent/outdent.

#### `getVisualHotkeys`()

Get an object array of visual hotkeys and their bindings from configuration, suitable for use in `react-hotkeys-hook`.

#### `isApplyButtonEnabled`()

Check auto-apply and dirty status to determine whether the Apply button should be enabled or not.

#### `openEditorPivotItem`(_operation_)

Open a specific pivot item from the editor.

#### `openHelpSite`()

Handle the Get Help command.

#### `repairFormatJson`()

Handle the Repair/Format JSON command.

#### `toggleAutoApply`()

Handle the Toggle Auto Apply command.

#### `toggleEditorPane`()

Hande the show/hide of the editor pane.

#### `updateBooleanProperty`(_name_, _value_)

Generic handler for a boolean (checkbox) property in the settings pane.

#### `updateProvider`(_provider_)

Handle the change in provider from one to the other and update necessary store dependencies and properties.

#### `updateRenderMode`(_renderMode_)

Handle the change in render mode from one to the other and update necessary store dependencies and properties.

#### 🔒 `dispatchAutoApply`()

Manages dispatch of the auto apply command state to the Redux store.

#### 🔒 `dispatchDefaultTemplate`()

Manages dispatch of the default template select method to the Redux store.

#### 🔒 `dispatchEditorPivotItem`(_operation_)

Manages dispatch of the a pivot item selection method to the Redux store.

#### 🔒 `dispatchEditorPaneToggle`()

Manages dispatch of the editor pane command method to the Redux store.

#### 🔒 `dispatchExportDialog`(_show_)

Manages dispatch of the export dialog command method to the Redux store.

#### 🔒 `getCommandKeyBinding`(_command_)

Convenience method to get key binding details from configuration for the specified command.

#### 🔒 `handlePersist`(_property_)

Manages persistence of a properties object to the Redux store from an operation.

## Interfaces

#### `IKeyboardShortcut`

## Types
