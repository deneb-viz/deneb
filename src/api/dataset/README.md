# Deneb - Dataset API

Functions and helpers for working with the visual dataset.

-   [Constants](#constants)
-   [Public Methods](#public-methods)
-   [Private Methods](#private-methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Public Methods

#### `getDataset`()

Get current processed dataset (metadata and values) from Deneb's Redux store.

#### `getEmptyDataset`()

Ensures an empty dataset is made available.

#### `getMetadata`()

Get all metadata for current processed dataset from Deneb's Redux store.

#### `getMetadataByKeys`(_keys_)

Get a reduced set of metadata based on an array of key names from Deneb's Redux store.

#### `getValues`()

Get all values (excluding metadata) for current processed dataset from Deneb's Redux store.

#### `getValueForDatum`(_metadata_, _datum_)

For the supplied (subset of) _metadata_ and _datum_ attempt to find the first matching row in the visual's processed dataset for this combination.

## Private Methods

## Interfaces

#### `IVisualDataset`

Processed visual data and column metadata for rendering.

#### `IVisualValueMetadata`

The structure of our visual dataset column metadata.

#### `ITableColumnMetadata`

Custom data role metadata, needed to manage functionality within the editors.

#### `IVisualValueRow`

Represents each values entry from the data view.

## Types
