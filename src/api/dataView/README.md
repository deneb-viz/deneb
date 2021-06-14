# Deneb - Data View API

Functions and helpers for working with the visual data view.

-   [Constants](#constants)
-   [Public Methods](#public-methods)
-   [Private Methods](#private-methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

#### `isFetchMoreEnabled`

Convenience constant that confirms whether the `fetchMoreData` feature switch is enabled (via [features](../features/README.md) API).

## Public Methods

#### `encodeDataViewFieldForSpec`(_displayName_)

If a Power BI column or measure contains characters that create problems in JSON or Vega/Vega-Lite expressions and encodings, we will replace them with an underscore, which is much easier to educate people on than having to learn all the specifics of escaping in the right context, in the right way.

-   Vega: https://vega.github.io/vega/docs/types/#Field
-   Vega-Lite: https://vega.github.io/vega-lite/docs/field.html

#### `getCategoryColumns`()

Retrieve all `powerbi.DataViewCategoryColumn[]` entries from the visual's data view, which are available from Deneb's Redux store.

## Private Methods

## Interfaces

## Types
