# Deneb - Data View API

Functions and helpers for working with the visual data view.

-   [Constants](#constants)
-   [Methods](#methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

#### `isFetchMoreEnabled`

Convenience constant that confirms whether the `fetchMoreData` feature switch is enabled (via [features](../features/README.md) API).

## Public Methods

#### `canFetchMore`()

Determines whether the visual can fetch more data, based on the feature switch and the corresponding flag in the Redux store (set by data processing methods).

#### `getCategoryColumns`()

Retrieve all `powerbi.DataViewCategoryColumn[]` entries from the visual's data view, which are available from Deneb's Redux store.

#### `getMappedDataset`(_categorical_)

Processes the data in the visual's data view into an object suitable for the visual's API.

#### `handleDataFetch`(_options_)

For the supplied `powerbi.VisualUpdateOptions`, interrogate the data view and visual settings to ensure that data is loaded. This could be capped to the window default, or via windowing if elibigle to do so.

#### `validateDataViewMapping`(_dataView_)

Validates the data view, to confirm that we can get past the splash screen.

#### `validateDataViewRoles`(_dataViews_, _dataRoles_)

Validates the data view, to confirm that we can get past the splash screen.

#### 🔒 `castPrimitiveValue`(_field_, _value_)

For a Power BI primitive, apply any data type-specific logic before returning a value that can work with the visual dataset.

#### 🔒 `dispatchResetLoadingCounters`()

Ensure that the Redux store counters are reset, ready for a new data load.

#### 🔒 `dispatchLoadingComplete`()

Ensures that the Redux store state is correct for a loaded dataset.

#### 🔒 `dispatchWindowLoad`(_rowsLoaded_)

Updates the Redux store for each window of the dataset loaded from the visual host.

#### 🔒 `encodeFieldForSpec`(_displayName_)

If a Power BI column or measure contains characters that create problems in JSON or Vega/Vega-Lite expressions and encodings, we will replace them with an underscore, which is much easier to educate people on than having to learn all the specifics of escaping in the right context, in the right way.

-   Vega: https://vega.github.io/vega/docs/types/#Field
-   Vega-Lite: https://vega.github.io/vega-lite/docs/field.html

#### 🔒 `getConsolidatedFields`(_categories_, _values_)

For supplied data view metadata (columns & measures), enumerate them and produce a unified list of all fields for the dataset.

#### 🔒 `getConsolidatedMetadata`(fields)

For all dataset fields, get a consolidated array of all entires, plus additional metadata to assist with template and selection ID generation when the data view is mapped.

#### 🔒 `getConsolidatedValues`(_categories_, _values_)

For supplied data view metadata (columns & measures), enumerate them and produce a unified list of all values for the dataset.

#### 🔒 `getDataRoleIndex`(_fields_, _role_)

Checks the supplied columns for the correct index of the content column, so that we can map it correctly later.

#### 🔒 `getDataRow`(_fields_, _values_, _index_)

For supplied data view consolidated metadata (all columns + measures), produce a suitable object representation of the row that corresponds with the dataset metadata.

#### 🔒 `getRowCount`(_categorical_)

Checks for valid `categorical` dataview and provides count of values.

#### 🔒 `handleAdditionalWindows`(_segment_)

Determine whether additional data can/should be loaded from the visual host, and manage this operation along with the Redux store state.

#### 🔒 `handleCounterReset`(_operationKind_)

Ensure that the Redux store loading counters are updated for the correct event in the visual workflow.

#### 🔒 `handleDataLoad`(_options_)

For the supplied visual update options, ensure that all workflow steps are managed.

#### 🔒 shouldFetchMore(_segment_)

Based on the supplied segment from the data view, plus Redux store state and settings, determine if the visual host should be instructed to request more data.

## Interfaces

#### `IAugmentedMetadataField`

#### `IDataProcessingPayload`

## Types

#### `TDataProcessingStage`

Stages to within the store when processing data, and therefore give us some UI hooks for the end-user.
