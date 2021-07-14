# Deneb - Properties API

Manages visual property consistency/persistence.

-   [Constants](#constants)
-   [Methods](#methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

## Methods

#### `resolveObjectProperties`(_objectName_, _properties_)

Handles resolution of object properties from the data view, either for persistence.

If a value is not supplied in the array of _properties_, the default value will be retrieved from the `VisualSettings` for the supplied name.

#### `updateObjectProperties`(_changes_)

Manage persistence of content to the visual's data view `objects`.

#### 🔒 `getNewObjectInstance`(_objectName_)

Gets an empty metadata object so that we can populate it with a value from the text box, or reset it.

#### 🔒 `persistProperties`()

Convenience function that returns the visual host's `persistProperties` instance from Deneb's Redux store.

## Interfaces

#### `IPersistenceProperty`

Property name and optional value for persistence operations.

## Types
