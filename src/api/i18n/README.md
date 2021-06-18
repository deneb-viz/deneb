# Deneb - I18N API

Management of any internationalization (18n) or locale-specific operations.

-   [Constants](#constants)
-   [Public Methods](#public-methods)
-   [Private Methods](#private-methods)
-   [Interfaces](#interfaces)
-   [Types](#types)

[< index](../README.md)

## Constants

## Public Methods

#### `getHostLM`()

Convenience function that returns the visual host's `powerbi.extensibility.ILocalizationManager` services instance from Deneb's Redux store.

#### `getLocale`()

Convenience function that returns the visual's locale (or overridden locale is using developer mode) from Deneb's Redux store.

## Private Methods

## Interfaces

## Types

#### `TLocale`

List of supported locales used for developer mode locale/formatting testing, without having to reconfigure the Power BI Service.
