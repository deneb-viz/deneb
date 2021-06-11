# Deneb API

Internal API methods for Deneb.

## API Reference

-   [config](#config)
-   [dataset](#dataset)
-   [dataView](#dataView)
-   [developer](#developer)
-   [event](#event)
-   [features](#features)
-   [formatting](#formatting)
-   [i18n](#i18n)
-   [selection](#selection)
-   [store](#store)
-   [template](#template)
-   [tooltip](#tooltip)

---

## config

Intended to provide methods for working with visual configuration (stored in `/deneb-config.json`). The schema/documentation for the config is in `/schema/deneb-config.json`.

#### config.**getConfig**()

Get object representation of visual configuration.

#### config.**getVisualMetadata**()

Get object representation of visual metadata (from pbiviz.json).

#### config.**providerVersions**

Object containing packaged versions for Vega and Vega-Lite, as derived from `package.json`.

## dataset

#### dataset.**getDataset**()

Get current processed dataset (metadata and values) from Deneb's Redux store.

#### dataset.**getMetadata**()

Get all metadata for current processed dataset from Deneb's Redux store.

#### dataset.**getMetadataByKeys**(_keys_)

Get a reduced set of metadata based on an array of key names from Deneb's Redux store.

#### dataset.**getValues**()

Get all values (excluding metadata) for current processed dataset from Deneb's Redux store.

#### dataset.**getValueForDatum**(_metadata_, _datum_)

For the supplied (subset of) _metadata_ and _datum_ attempt to find the first matching row in the visual's processed dataset for this combination.

#### dataset.**IVisualDataset**

Processed visual data and column metadata for rendering.

#### dataset.**IVisualValueMetadata**

The structure of our visual dataset column metadata.

#### dataset.**ITableColumnMetadata**

Custom data role metadata, needed to manage functionality within the editors.

#### dataset.**IVisualValueRow**

Represents each values entry from the data view.

## dataView

Functions and helpers for working with the visual data view.

#### dataView.**encodeDataViewFieldForSpec**(_displayName_)

If a Power BI column or measure contains characters that create problems in JSON or Vega/Vega-Lite expressions and encodings, we will replace them with an underscore, which is much easier to educate people on than having to learn all the specifics of escaping in the right context, in the right way.

-   Vega: https://vega.github.io/vega/docs/types/#Field
-   Vega-Lite: https://vega.github.io/vega-lite/docs/field.html

#### dataView.**getCategoryColumns**()

Retrieve all `powerbi.DataViewCategoryColumn[]` entries from the visual's data view, which are available from Deneb's Redux store.

#### dataView.**isFetchMoreEnabled**

Convenience constant that confirms whether the `fetchMoreData` feature switch is enabled (via [features](#features) API).

## developer

#### dataView.**isDeveloperModeEnabled**

Convenience constant that confirms whether the `developerMode` feature switch is enabled (via [features](#features) API).

## event

#### event.**resolveCoordinates**(_event_)

For the supplied event, returns an [x, y] array of mouse coordinates.

## features

For working with enabled visual features.

#### features.**isFeatureEnabled(_feature_)**

Check config for named feature flag and verify that it's enabled. Also returns `false` if flag does not exist.

## formatting

#### formatting.**createFormatterFromString**(_format_)

Convenience function that creates a Power BI `valueFormatter.IValueFormatter` using the supplied format string, and using the visual's locale.

## i18n

#### i18n.**getLocale()**

Convenience function that returns the visual's locale (or overridden locale is using developer mode) from Deneb's Redux store.

## selection

#### selection.**createSelectionId**(_metadata_, _categories_, _rowIndex_)

For the supplied (subset of) _metadata_, Power BI data view _categories_ and _rowIndex_, attempt to generate a valid `powerbi.visuals.ISelectionId`.

Will return a `null` selector if one cannot be resolved.

#### selection.**getSelectionIdBuilder**()

Get a new instance of a `powerbi.visuals.ISelectionIdBuilder` from Deneb's Redux store, so that we can use to to create selection IDs for data points.

#### selection.**resolveDatumForKeywords**()

For a given datum, ensure that the `selectionKeywords` are stripped out so that we can get actual fields and values assigned to a datum.

#### selection.**resolveDatumForMetadata**(_metadata_, _datum_)

For a given (subset of) _metadata_ and _datum_, create an `IVisualValueRow` that can be used to search for matching values in the visual's dataset.

#### selection.**resolveDatumValueForMetadataColumn**(_column_, _value_)

Because Vega's tooltip channel supplies datum field values as strings, for a supplied metadata _column_ and _datum_, attempt to resolve it to a pure type, so that we can try to use its value to reconcile against the visual's dataset in order to resolve selection IDs.

#### selection.**selectionKeywords**

Array of reserved keywords used to handle selection IDs from the visual's default data view.

#### selection.**isContextMenuEnabled**

Convenience constant that confirms whether the `selectionContextMenu` feature switch is enabled (via [features](#features) API).

#### selection.**isDataPointEnabled**

Convenience constant that confirms whether the `selectionDataPoint` feature switch is enabled (via [features](#features) API).

#### selection.**IVegaViewDatum**

Interface specifying a flexible key/value pair object, which is supplied from Vega's tooltip handler and usually casted as `any`.

## store

#### store.**getState**()

Returns the current state from Deneb's Redux store.

## template

Functions and helpers for template management.

#### template.**getEscapedReplacerPattern**(_value_)

When performing placeholder replacements, we need to ensure that special characters used in regex qualifiers are suitably escaped so that we don't inadvertently mangle them.

Returns escaped string, suitable for pattern matching if any special characters are used.

#### template.**getExportFieldTokenPatterns**(_name_)

As fields can be used in a variety of places in a Vega specification, this generates an array of regex patterns we should use to match eligible placeholders in export templates. All patterns should contain three capture groups:

-   `$1`: Preceding pattern used to identify placeholder
-   `$2`: The resolved field placeholder
-   `$3`: Trailing pattern used to identify placeholder

Returns string array of RegEx patterns that should match all occurrences of specified placeholder name within a template.

#### template.**replaceExportTemplatePlaceholders**(_template_, _name_, _token_)

When exporting a template, any occurrences of columns or measures need to be replaced in the spec. This takes a given stringified _template_, and will:

1. Encode the supplied _name_ for safe encapsulation.
2. Iterate through known patterns where the supplied placeholder _name_ could be referred to for encodings and expressions and replace them with the supplied _token_ in the supplied _template_.
3. Return the modified _template_.

Returns _template_ with all _name_ occurrences replaced with _token_.

#### template.**replaceTemplateFieldWithToken**(_template_, _pattern_, _token_)

For a supplied (stringified) _template_, RegEx _pattern_ and replacement _token_, perform a global replace on all occurrences and return it.

_pattern_ is a valid RegEx pattern to search template for. As per notes in `getExportFieldTokenPatterns`, this pattern requires **three** capture groups in its definition in order to ensure that preceding and trailing patterns used to identify a placeholder are preserved.

Returns processed _template_, with _token_(s) in-place of all valid _pattern_ occurrences.

## tooltip

Functions and helpers for managing tooltip display.

#### tooltip.**getTooltipHandler**(_isSettingEnabled_, _tooltipService_)

Get a new custom Vega tooltip handler for Power BI. If the supplied setting is enabled, will return a `resolveTooltipContent` handler for the supplied _tooltipService_.

#### tooltip.**isHandlerEnabled**

Convenience constant that confirms whether the `tooltipHandler` feature switch is enabled (via [features](#features) API).

#### 🔒 tooltip.**extractTooltipDataItemsFromObject**(_tooltip_)

For a given Vega `tooltip` object (key-value pairs), extract any non-reserved keys, and structure suitably as an array of standard Power BI tooltip items (`VisualTooltipDataItem[]`).

#### 🔒 tooltip.**getFieldsEligibleForAutoFormat**(_tooltip_)

For given Vega `tooltip` object (key-value pairs), return an object of fields from the visual dataset's metadata that are in the tooltip, and eligible for automatic formatting. Eligibility criteria is as follows:

-   The `tooltipResolveNumberFieldFormat` feature is enabled, and:
-   The field display name has a corresponding entry in the visual datset's metadata, and:
-   The field is a number type, and:
-   The tooltip value exactly matches the number representation in the `datum`.

#### 🔒 tooltip.**getTooltipIdentity**(_datum_, _tooltip_)

For a supplied `datum` object from a Vega tooltip handler, attempt to identify a valid Power BI selection ID that can be added to the tooltip call for any report pages that Power BI may have for the selector. If there is no explicit identity discoverable in the datum, then it will attempt to create a selection ID from the dataset and data view based on known values.

Returns single item array containing valid `ISelectionId` (or `null` if a selection ID cannot be resolved).

#### 🔒 tooltip.**hideTooltip**(_tooltipService_)

Request Power BI hides the tooltip.

#### tooltip.**isResolveNumberFormatEnabled**

Convenience constant that confirms whether the `tooltipResolveNumberFieldFormat` feature switch is enabled (via [features](#features) API).

The truthiness of this result depends on [tooltip.**isHandlerEnabled**](#tooltipishandlerenabled) being `true` also.

#### 🔒 tooltip.**isTouchEvent**

Convenience constant for tooltip events, as it's required by Power BI.

#### 🔒 tooltip.**resolveTooltipContent**(_tooltipService_)(_vegaTooltip_)

For the supplied Power BI `ITooltipService` service instance from the visual host, apply the [`vegaTooltip` object](https://github.com/vega/vega-tooltip/blob/master/docs/APIs.md) supplied by the Vega view and attempt to show or hide a Power BI tooltip based on its contents.
