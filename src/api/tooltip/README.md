# Deneb - Toolip API

Functions and helpers for managing tooltip display.

-   [Constants](#constants)
-   [Public Methods](#public-methods)
-   [Private Methods](#private-methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

#### `isHandlerEnabled`

Convenience constant that confirms whether the `tooltipHandler` feature switch is enabled (via [features](../features/README.md) API).

#### `isResolveNumberFormatEnabled`

Convenience constant that confirms whether the `tooltipResolveNumberFieldFormat` feature switch is enabled (via [features](../features/README.md) API).

The truthiness of this result depends on [`isHandlerEnabled`](#tooltipishandlerenabled) being `true` also.

#### 🔒 `isTouchEvent`

Convenience constant for tooltip events, as it's required by Power BI.

## Public Methods

#### `getTooltipHandler`(_isSettingEnabled_, _tooltipService_)

Get a new custom Vega tooltip handler for Power BI. If the supplied setting is enabled, will return a `resolveTooltipContent` handler for the supplied _tooltipService_.

## Private Methods

#### `extractTooltipDataItemsFromObject`(_tooltip_)

For a given Vega `tooltip` object (key-value pairs), extract any non-reserved keys, and structure suitably as an array of standard Power BI tooltip items (`VisualTooltipDataItem[]`).

#### `getFieldsEligibleForAutoFormat`(_tooltip_)

For given Vega `tooltip` object (key-value pairs), return an object of fields from the visual dataset's metadata that are in the tooltip, and eligible for automatic formatting. Eligibility criteria is as follows:

-   The `tooltipResolveNumberFieldFormat` feature is enabled, and:
-   The field display name has a corresponding entry in the visual datset's metadata, and:
-   The field is a number type, and:
-   The tooltip value exactly matches the number representation in the `datum`.

#### `getTooltipIdentity`(_datum_, _tooltip_)

For a supplied `datum` object from a Vega tooltip handler, attempt to identify a valid Power BI selection ID that can be added to the tooltip call for any report pages that Power BI may have for the selector. If there is no explicit identity discoverable in the datum, then it will attempt to create a selection ID from the dataset and data view based on known values.

Returns single item array containing valid `ISelectionId` (or `null` if a selection ID cannot be resolved).

#### `hideTooltip`(_tooltipService_)

Request Power BI hides the tooltip.

#### `resolveTooltipContent`(_tooltipService_)(_vegaTooltip_)

For the supplied Power BI `ITooltipService` service instance from the visual host, apply the [`vegaTooltip` object](https://github.com/vega/vega-tooltip/blob/master/docs/APIs.md) supplied by the Vega view and attempt to show or hide a Power BI tooltip based on its contents.

## Interfaces

## Types
