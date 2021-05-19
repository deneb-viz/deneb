# Deneb API

Internal API methods for Deneb.

## API Reference

-   [dataView](#dataView)
-   [event](#event)
-   [selection](#selection)
-   [template](#template)
-   [tooltip](#tooltip)

---

## dataView

Functions and helpers for working with the visual data view.

> dataView.**encodeDataViewFieldForSpec**(_displayName_)

If a Power BI column or measure contains characters that create problems in JSON or Vega/Vega-Lite expressions and encodings, we will replace them with an underscore, which is much easier to educate people on than having to learn all the specifics of escaping in the right context, in the right way.

-   Vega: https://vega.github.io/vega/docs/types/#Field
-   Vega-Lite: https://vega.github.io/vega-lite/docs/field.html

## event

> event.**resolveCoordinates**(_event_)

For the supplied event, returns an [x, y] array of mouse coordinates.

## selection

> selection.**selectionKeywords**

Array of reserved keywords used to handle selection IDs from the visual's default data view.

## template

Functions and helpers for template management.

> template.**getEscapedReplacerPattern**(_value_)

When performing placeholder replacements, we need to ensure that special characters used in regex qualifiers are suitably escaped so that we don't inadvertently mangle them.

Returns escaped string, suitable for pattern matching if any special characters are used.

> template.**getExportFieldTokenPatterns**(_name_)

As fields can be used in a variety of places in a Vega specification, this generates an array of regex patterns we should use to match eligible placeholders in export templates. All patterns should contain three capture groups:

-   `$1`: Preceding pattern used to identify placeholder
-   `$2`: The resolved field placeholder
-   `$3`: Trailing pattern used to identify placeholder

Returns string array of RegEx patterns that should match all occurrences of specified placeholder name within a template.

> template.**replaceExportTemplatePlaceholders**(_template_, _name_, _token_)

When exporting a template, any occurrences of columns or measures need to be replaced in the spec. This takes a given stringified _template_, and will:

1. Encode the supplied _name_ for safe encapsulation.
2. Iterate through known patterns where the supplied placeholder _name_ could be referred to for encodings and expressions and replace them with the supplied _token_ in the supplied _template_.
3. Return the modified _template_.

Returns _template_ with all _name_ occurrences replaced with _token_.

> template.**replaceTemplateFieldWithToken**(_template_, _pattern_, _token_)

For a supplied (stringified) _template_, RegEx _pattern_ and replacement _token_, perform a global replace on all occurrences and return it.

_pattern_ is a valid RegEx pattern to search template for. As per notes in `getExportFieldTokenPatterns`, this pattern requires **three** capture groups in its definition in order to ensure that preceding and trailing patterns used to identify a placeholder are preserved.

Returns processed _template_, with _token_(s) in-place of all valid _pattern_ occurrences.

## tooltip

Functions and helpers for managing tooltip display.

> tooltip.**getTooltipHandler**(_isSettingEnabled_, _tooltipService_)

Get a new custom Vega tooltip handler for Power BI. If the supplied setting is enabled, will return a `resolveTooltipContent` handler for the supplied _tooltipService_.

> tooltip.**ITooltipDatum**

Interface specifying a flexible key/value pair object, which is supplied from Vega's tooltip handler and usually casted as `any`.

> 🔒 tooltip.**extractTooltipDataItemsFromObject**(_tooltip_)

For a given Vega `tooltip` object (key-value pairs), extract any non-reserved keys, and structure suitably as an array of standard Power BI tooltip items (`VisualTooltipDataItem[]`).

> 🔒 tooltip.**getTooltipIdentity**(_datum_)

For a supplied `datum` object from a Vega tooltip handler, attempt to identify a valid Power BI selection ID that can be added to the tooltip call for any report pages that Power BI may have for the selector.

Returns single item array containing valid `ISelectionId` (or `null` if a selection ID cannot be resolved).

> 🔒 tooltip.**resolveTooltipContent**(_tooltipService_)(_vegaTooltip_)

For the supplied Power BI `ITooltipService` service instance from the visual host, apply the [`vegaTooltip` object](https://github.com/vega/vega-tooltip/blob/master/docs/APIs.md) supplied by the Vega view and attempt to show or hide a Power BI tooltip based on its contents.
