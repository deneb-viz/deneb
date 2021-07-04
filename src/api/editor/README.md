# Deneb - Editor API

-   [Constants](#constants)
-   [Public Methods](#public-methods)
-   [Private Methods](#private-methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

#### `specEditorService`

Instance of `VisualEditor` that is used to track and manage specification in the visual.

#### `configEditorService`

Instance of `VisualEditor` that is used to track and manage config in the visual.

#### 🔒 `VisualEditor`

Generic function to abstract common properties and methods for each visual editor. Defined with [`IVisualEditor`](#ivisualeditor).

This has some breaking issues if stored in `private.ts` so is currently in `public.ts` but not exportable.

## Public Methods

#### `getAssignedEditor`(_role_)

For the supplied role, get the correct instance of `VisualEditor`.

#### `handleComponentUpdate`(_jsonEditor_, _role_)

Logic to manage updates in the main React component.

## Private Methods

#### `debounceInput`()

Ensures that when auto-apply is enabled, the Redux store is updated at a sensible interval after input has finished, rather than applying changes for every keystroke.

#### `getAceEditor`(_jsonEditor_)

Gets the Ace editor instance from the supplied `jsonEditor`.

#### `getCompleters`()

For an editor, we need to populate the completers for the end-user. This traverses the metadata for all columns and measures added to the Values data role and returns them as a valid Ace `Completer`.

#### `getNewJsonEditor`(_container_)

Creates a new JSONEditor object in the supplied DOM element and binds configuration and behavior.

This has some breaking issues if stored in `private.ts` so is currently in `public.ts` but not exportable.

#### `getInitialText`(_role_)

For the given role, retrieve its value from the visual properties (via Redux store).

#### `handleTextEntry`()

Logic used to handle changes in the editor (such as auto-apply, if enabled).

#### `resolveCompleterMeta`(_field_)

For any data-based completers in the editor, provide a qualifier denoting whether it's a column, measure or something else.

#### `resolveCompleterScore`(_field_, _index_)

Applies an order of precedence for an object in the editor's auto-completion.

#### `setAceOptions`(_jsonEditor_, _options_)

Applies options to the JSON editor.

#### `setProviderSchema`(_jsonEditor_, _role_)

Ensures that the correct JSON schema is applied to the JSON editor for validation, based on the specificed role.

#### `setText`(_jsonEditor_, _text_)

Sets the embedded Ace editor text within JSONEditor (using the JSONEditor method removes undo from the embedded editor, so we want to ensure we have sensible encapsulation to prevent this as much as possible).

#### `updateCompleters`(_jsonEditor_, _role_)

Ensure that editor completers are updated/synced to match anything the user has added to (or removed from) the Values data role.

## Interfaces

#### `IVisualEditor`

Specifies the structure of each `VisualEditor` instance.

-   `role`: assigned `TEditorRole`.
-   `jsonEditor`: attached instance of `JSONEditor`, used for maintaining either specification or config object.
-   `createEditor`: creates a new `JSONEditor` in the visual DOM and assignes it back to the `jsonEditor` property for subsequent operations within the UI.
-   `getText`: retrieve the current JSON content from the editor instance.
-   `setText`: set the current JSON content in the editor instance.

#### `IVisualEditorProps`

Properties for the `Editor` React component.

-   `role`: assigned `TEditorRole`.

## Types

#### `TEditorRole`

Used to specify the types of operatons we should have within the pivot control in the editor pane.
