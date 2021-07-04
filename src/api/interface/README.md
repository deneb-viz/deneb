# Deneb - Interface API

Manages interface-specific operations.

-   [Constants](#constants)
-   [Public Methods](#public-methods)
-   [Private Methods](#private-methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

## Public Methods

#### `calculateVegaViewport`(_viewport_, _paneWidth_, _interfaceType_, _position_)

Calculate the dimensions of the Vega/Vega-Lite visual viewport (height/width) based on the interface state and a number of other factors (including any config defaults).

#### `getResizablePaneDefaultWidth`(_viewport_, _position_)

Calculate the default size of the resizable pane (in px) based on current viewport size and config defaults.

#### `getResizablePaneMaxSiz`e()

Work out what the maximum size of the resizable pane should be (in px), based on the persisted visual (store) state.

#### `getResizablePaneMinSize`()

Work out what the minimum size of the resizable pane should be (in px), based on the persisted visual (store) state.

#### `getResizablePaneSize`(_paneExpandedWidth_, _editorPaneIsExpanded_, _viewport_, _position_)

Based on the current state of the resizable pane, resolve its actual width on the screen.

#### `isDialogOpen`()

Determine whether Deneb is currently showing a dialog, based on the Redux store.

#### `resolveInterfaceType`(_dataViewFlags_, _editMode_, _isInFocus_, _viewMode_)

Calculated during Redux store update, and based on this state, determine what interface should be displayed to the end-user.

## Private Methods

## Interfaces

## Types

#### `TEditorPosition`

Type to allow structure of the value for position of editor within the

#### `TVisualInterface`

Type to allow structure of the value for type of interface we need to display to the end-user.
