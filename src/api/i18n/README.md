# Deneb - i18N API

Management of any internationalization (i18n) or locale-specific operations.

-   [Constants](#constants)
-   [Methods](#methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

#### `locales`

i18 locale data for D3-based formatting.

## Methods

#### `getHostLM`()

Convenience function that returns the visual host's `powerbi.extensibility.ILocalizationManager` services instance from Deneb's Redux store.

#### `getLocale`()

Convenience function that returns the visual's locale (or overridden locale is using developer mode) from Deneb's Redux store.

## Interfaces

#### `ILocaleConfiguration`

Represents all i18n date and time formats available for D3 that we can add to the visual.

#### `ILocaleFormatConfiguration`

#### `ILocaleTimeConfiguration`

## Types

#### `TLocale`

List of supported locales used for developer mode locale/formatting testing, without having to reconfigure the Power BI Service.
