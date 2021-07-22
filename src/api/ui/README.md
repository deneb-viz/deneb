# Deneb - User Interface API

Manages interface-specific operations.

-   [Constants](#constants)
-   [Methods](#methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

## Methods

#### `getCommandBarEditCommands`()

Gets the command bar items for the left side of the bar, which is concerned with persistence.

#### `getCommandBarFarCommands`()

Gets the command bar items for the far side of the bar, which is concerned with templating and support operations.

#### `getVersionInfo`()

Returns visual + Vega + Vega-Lite version information as a single string.

#### `isApplyDialogHidden`()

Determine whether the apply changes dialog should be hidden or not. This dialog is used to prompt the user to save their changes if they leave the editor and the editors are dirty.

#### `isDialogOpen`()

Determine whether Deneb is currently showing a dialog, based on the Redux store.

#### `resolveVisualMode`(_dataViewFlags_, _editMode_, _isInFocus_, _viewMode_)

Calculated during Redux store update, and based on this state, determine what interface should be displayed to the end-user.

#### 🔒 `getApplyCommandItem`()

#### 🔒 `getAutoApplyCommandItem`(_enabled_, _canAutoApply_)

#### 🔒 `getRepairFormatCommandItem`()

#### 🔒 `getNewSpecCommandItem`()

#### 🔒 `getExportSpecCommandItem`()

#### 🔒 `getHelpCommandItem`()

#### 🔒 `hasNoSpec`()

#### 🔒 `isReadOnly`(_viewMode_)

Logic to determine if the visual is currently in read-only mode.

#### 🔒 `isReadWriteDefault`(_viewMode_, _editMode_)

Logic to determine if the visual is currently displayed in read/write mode (i.e. it's in Desktop, or Service + edit).

#### 🔒 `isReadWriteAdvanced`(_viewMode_, _editMode_)

Logic to determine if the visual is currently in the Advanced Editor.

#### 🔒 `resolveAutoApplyAriaLabel`(_enabled_)

#### 🔒 `resolveAutoApplyIcon`(_enabled_)

#### 🔒 `resolveAutoApplyText`(_enabled_)

## Interfaces

## Types

#### `TEditorPosition`

Type to allow structure of the value for position of editor within the advanced editor view.

#### `TModalDialogType`

Modal dialog type (used for specific ops handling).

#### `TVisualMode`

Type to allow structure of the value for type of interface we need to display to the end-user.
