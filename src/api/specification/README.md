# Deneb - Specification API

Handles operations around specification parsing and persistence.

-   [Constants](#constants)
-   [Public Methods](#public-methods)
-   [Private Methods](#private-methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

## Public Methods

#### `createFromTemplate`(_provider_, _template_)

For the supplied provider and specification template, add this to the visual and persist to properties, ready for subsequent editing.

#### `determineProviderFromSpec`(_spec_)

For the supplied spec, parse it to determine which provider we should use when importing it (precedence is Vega-Lite), and will then fall-back to Vega if VL is not valid.

#### `fixAndFormat`()

For the specification and configuration in each editor, attempt to fix any simple issues that might prevent it from being valid JSON. We'll also indent it if valid. If it doesn't work, we'll update the store with the error details so that we can inform the user to take action.

#### `getInitialConfig`()

Retrieves the config from our visual properties, and enriches it with anything we want to abstract out from the end-user to make things as "at home" in Power BI as possible.

#### `getParsedConfigFromSettings`()

Gets the `config` from our visual objects and parses it to JSON.

#### `indentJson`(_json_)

For the supplied object, convert to string and indent according to specified tab size.

#### `persist`()

Resolve the spec/config and use the `properties` API for persistence.

#### `registerCustomExpressions`()

Apply any custom expressions that we have written (e.g. formatting) to the specification prior to rendering.

#### `resolveLoaderLogic`()

Create a custom Vega loader for the visual. The intention was to ensure that we could use this to disable loading of external content. However, it worked for data but not for images. This is essentially a stub, but it's left here in case we can make it work the correct way in future.

## Private Methods

#### `cleanJsonInputForPersistence`(_operation_, _input_)

For a given operation and string input, ensure that it's trimmed and replaced with suitable defaults if empty.

#### `dispatchFixStatus`(_result_)

Dispatch the results of a fix and repair operation to the Redux store.

#### `dispatchSpec`(_compiledSpec_)

Dispatch a compiled specification to the Redux store.

#### `getBaseValidator`()

Get a new instance of `Ajv`, with the necessary base configuration for validating a Vega or Vega-Lite specification.

#### `getExistingSelectors`()

Get any existing selections (e.g. through bookmarks) to ensure that they are restored into the visual's current selection correctly and able to be passed into the specification's `init` property for our selection.

#### `getSchemaValidator`(_schema_)

Apply the supplied JSON schema to a `getBaseValidator` and attempt to compile it.

#### `resolveFixErrorMessage`(_success_, _fixedRawSpec_, _fixedRawConfig_)

For the results of a fix and repair operation, resolve the error message for the end-user (if applicable).

#### `resolveURls`(_content_)

For a given body of text, replace anything that looks like a remote URI with blank text. If the URI has a `data:` prefix then we'll allow it, so that the user can specify base64 content.

## Interfaces

#### `ICompiledSpec`

Represents a compiled specification, including any additional metadata needed to manage it downstream in the UI.

#### `IFixPayload`

Represents the structure of the required data to dispatch back to the Redux store after a fix operation has been carried out.

#### `IFixResult`

Represents the results of a fix and repair operation.

#### `IFixStatus`

Represents the status and additional metadata of a fix and repair against an individual specification or config component.

## Types

#### `TSpecProvider`

Valid providers for the visual.

#### `TSpecRenderMode`

Used to constrain Vega rendering to supported types.
