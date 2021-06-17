# Deneb - Template API

Functions and helpers for template management.

-   [Constants](#constants)
-   [Public Methods](#public-methods)
-   [Private Methods](#private-methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

## Public Methods

#### `getExportTemplate`()

Combines spec, config and specified metadata to produce a valid JSON template for export.

#### `getNewExportTemplateMetadata`()

Instantiates a new object for export template metadata, ready for population.

#### `getPlaceholderDropdownText`(_datasetField_)

Supply assistive text to a placeholder, based on whether it allows columns, measures or both.

#### `getPlaceholderResolutionStatus`(_template_)

Enumerate a template's placeholders and confirm they all have values supplied by the user. If a template doesn't have any placeholders then this will also be regarded as fulfilled.

#### `getReplacedTemplate`(_template_)

For a supplied template, substitute placeholder values and return a stringified representation of the object.

#### `onTemplateFileSelect`(_file_)

Attempt to load the selected template JSON file and validate it.

#### `replaceTemplateFieldWithToken`(_template_, _pattern_, _token_)

For a supplied (stringified) _template_, RegEx _pattern_ and replacement _token_, perform a global replace on all occurrences and return it.

_pattern_ is a valid RegEx pattern to search template for. As per notes in `getExportFieldTokenPatterns`, this pattern requires three capture groups in its definition in order to ensure that preceding and trailing patterns used to identify a placeholder are preserved.

Returns processed _template_, with _token_(s) in-place of all valid _pattern_ occurrences.

#### `resolveTypeIcon`(_type_)

For a given column or measure (or template placeholder), resolve the UI icon for its data type.

#### `resolveTypeIconTitle`(_type_)

For a given column or measure (or template placeholder), resolve the UI tooltip/title text for its data type.

#### `resolveValueDescriptor`(_type_)

For a given column or measure (or template placeholder), resolve its type against the corresponding Power BI value descriptor.

#### `resolveVisualMetaToDatasetField`(_metadata_, _encodedName_)

For a given `DataViewMetadataColumn`, and its encoded name produces a new `ITemplateDatasetField` object that can be used for templating purposes.

#### `updateExportState`(_state_)

Persist the supplied `TTemplateExportState` to Deneb's Redux store.

#### `validateSpecificationForExport`()

Checks to see if current spec is valid and updates store state for UI accordingly.

## Private Methods

#### `getEscapedReplacerPattern`(_value_)

When performing placeholder replacements, we need to ensure that special characters used in regex qualifiers are suitably escaped so that we don't inadvertently mangle them.

Returns escaped string, suitable for pattern matching if any special characters are used.

#### `getExportFieldTokenPatterns`(_name_)

As fields can be used in a variety of places in a Vega specification, this generates an array of regex patterns we should use to match eligible placeholders in export templates. All patterns should contain three capture groups:

-   `$1`: Preceding pattern used to identify placeholder
-   `$2`: The resolved field placeholder
-   `$3`: Trailing pattern used to identify placeholder

Returns string array of RegEx patterns that should match all occurrences of specified placeholder name within a `

#### `onReaderLoad`(_event_)

When a template JSON file is selected for import, this defines the logic for reading the file and parsing it to ensure that it is both valid JSON, and also contains the necessary metadata to provide data role substitution to the end-user. This will dispatch the necessary state to the store for further action as required.

#### `replaceExportTemplatePlaceholders`(_template_, _name_, _token_)

When exporting a template, any occurrences of columns or measures need to be replaced in the spec. This takes a given stringified _template_, and will:

1. Encode the supplied _name_ for safe encapsulation.
2. Iterate through known patterns where the supplied placeholder _name_ could be referred to for encodings and expressions and replace them with the supplied _token_ in the supplied _template_.
3. Return the modified _template_.

Returns _template_ with all _name_ occurrences replaced with _token_.

#### `resolveExportUserMeta`()

Generates a suitable `usermeta` object for the current `templateReducer` state and provides suitable defaults if they are missing, so that generated export templates make sense (as much as possible).

#### `updateExportError`(_i18nKey_)

Persist the supplied export error information to the Redux store.

#### `updateImportError`(_i18nKey_, _errors_)

Persist the supplied import error information to the Redux store.

#### `updateImportState`(_state_)

Persist the supplied `TTemplateImportState` to Deneb's Redux store.

#### `updateImportSuccess`(_payload_)

Persist the resolved template payload to the Redux store.

## Interfaces

#### `ITemplateImportErrorPayload`

Payload for suppliying import error details to the Redux store.

#### `ITemplateExportFieldUpdatePayload`

Payload for supplying state of export field values for templates.

#### `ITemplateImportPayload`

Payload for suppliying import templte details to the Redux store.

## Types

#### `TTemplateExportState`

Stages we go through when exporting a template so that the interface can respond accordingly.

#### `TTemplateImportState`

Stages we go through when importing a template so that the interface can respond accordingly.
