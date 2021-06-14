# Deneb - Selection API

API for managing selection and interactivity within the visual.

-   [Constants](#constants)
-   [Public Methods](#public-methods)
-   [Private Methods](#private-methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

#### `isContextMenuEnabled`

Convenience constant that confirms whether the `selectionContextMenu` feature switch is enabled (via [features](../features/README.md) API).

#### `isDataPointEnabled`

Convenience constant that confirms whether the `selectionDataPoint` feature switch is enabled (via [features](../features/README.md) API).

#### `selectionKeywords`

Array of reserved keywords used to handle selection IDs from the visual's default data view.

## Public Methods

#### `createSelectionId`(_metadata_, _categories_, _rowIndex_)

For the supplied (subset of) _metadata_, Power BI data view _categories_ and _rowIndex_, attempt to generate a valid `powerbi.visuals.ISelectionId`.

Will return a `null` selector if one cannot be resolved.

#### `getSelectionIdBuilder`()

Get a new instance of a `powerbi.visuals.ISelectionIdBuilder` from Deneb's Redux store, so that we can use to to create selection IDs for data points.

#### `getSidString`(_id_)

We have some compatibility issues between `powerbi.extensibility.ISelectionId` and `powerbi.visuals.ISelectionId`, as well as needing to coerce Selection IDs to strings so that we can set intial selections for Vega-Lite (as objects aren't supported). This consolidates the logic we're using to resolve a Selection ID to a string representation suitable for use across the visual.

#### `resolveDatumForKeywords`()

For a given datum, ensure that the `selectionKeywords` are stripped out so that we can get actual fields and values assigned to a datum.

#### `resolveDatumForMetadata`(_metadata_, _datum_)

For a given (subset of) _metadata_ and _datum_, create an `IVisualValueRow` that can be used to search for matching values in the visual's dataset.

#### `resolveDatumValueForMetadataColumn`(_column_, _value_)

Because Vega's tooltip channel supplies datum field values as strings, for a supplied metadata _column_ and _datum_, attempt to resolve it to a pure type, so that we can try to use its value to reconcile against the visual's dataset in order to resolve selection IDs.

## Private Methods

## Interfaces

#### `IVegaViewDatum`

Interface specifying a flexible key/value pair object, which is supplied from Vega's tooltip handler and usually casted as `any`.

## Types
